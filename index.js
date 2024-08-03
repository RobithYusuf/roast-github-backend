const cors = require("cors");
const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
require("dotenv").config();
const {
	GoogleGenerativeAI,
	GoogleGenerativeAIResponseError,
} = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();
const corsOptions = {
	origin: "https://roast-github.deployweb.site",
	methods: ["POST"],
	allowedHeaders: ["Content-Type", "Authorization"],
	credentials: true,
};

app.use(cors(corsOptions));
app.use(bodyParser.json());

// Objek untuk menyimpan data rate limiting
const rateLimitStore = new Map();

// Middleware rate limiting
const rateLimiter = (req, res, next) => {
	const ip = req.ip;
	const now = Date.now();
	const windowMs = 10 * 60 * 1000; // 10 menit dalam milidetik

	if (rateLimitStore.has(ip)) {
		const data = rateLimitStore.get(ip);
		const windowStart = data.windowStart;
		const requestCount = data.requestCount;

		if (now - windowStart > windowMs) {
			// Reset jika window waktu sudah berlalu
			rateLimitStore.set(ip, { windowStart: now, requestCount: 1 });
			next();
		} else if (requestCount < 100) {
			// Izinkan request jika masih dalam batas
			rateLimitStore.set(ip, {
				windowStart,
				requestCount: requestCount + 1,
			});
			next();
		} else {
			// Rate limit tercapai
			res.status(429).json({
				error: "Rate limit exceeded. Please try again after 10 minutes.",
			});
		}
	} else {
		// IP baru, tambahkan ke store
		rateLimitStore.set(ip, { windowStart: now, requestCount: 1 });
		next();
	}
};

// Gunakan middleware rate limiting
app.use("/roast", rateLimiter);

async function fetchGitHubData(username) {
	let headerGithub = {};
	if (process.env.GITHUB_TOKEN != null) {
		headerGithub = {
			Authorization: `token ${process.env.GITHUB_TOKEN}`,
		};
	}

	let profileResponse;
	let repoResponse;
	let readmeResponse;

	try {
		profileResponse = await axios.get(
			`https://api.github.com/users/${username}`,
			{ headers: headerGithub },
		);
	} catch (error) {
		profileResponse = await axios.get(
			`https://api.github.com/users/${username}`,
		);
		headerGithub = {}; // Reset header if token doesn't work
	}

	repoResponse = await axios.get(
		`https://api.github.com/users/${username}/repos?sort=updated`,
		{ headers: headerGithub },
	);

	try {
		readmeResponse = await axios.get(
			`https://raw.githubusercontent.com/${username}/${username}/main/README.md`,
			{ headers: headerGithub },
		);
	} catch (error) {
		try {
			readmeResponse = await axios.get(
				`https://raw.githubusercontent.com/${username}/${username}/master/README.md`,
				{ headers: headerGithub },
			);
		} catch (error) {
			readmeResponse = { status: 404, data: null };
		}
	}

	return { profileResponse, repoResponse, readmeResponse };
}

app.post("/roast", async (req, res) => {
	const { username } = req.query;
	const { jsonData } = req.body;
	let datas = null;

	if (jsonData != null && jsonData !== "") {
		try {
			datas = JSON.parse(jsonData);
		} catch (error) {
			datas = null;
		}
	}

	try {
		let readmeContent = null;
		if (datas == null) {
			const { profileResponse, repoResponse, readmeResponse } =
				await fetchGitHubData(username);

			datas = {
				name: profileResponse.data.name,
				bio: profileResponse.data.bio,
				company: profileResponse.data.company,
				location: profileResponse.data.location,
				followers: profileResponse.data.followers,
				following: profileResponse.data.following,
				public_repos: profileResponse.data.public_repos,
				avatar_url: profileResponse.data.avatar_url,
				repositories: repoResponse.data
					.map((repo) => ({
						name: repo.name,
						description: repo.description,
						language: repo.language,
						stargazers_count: repo.stargazers_count,
						open_issues_count: repo.open_issues_count,
						license: repo.license,
						fork: repo.fork,
					}))
					.slice(0, 50),
			};
			readmeContent = readmeResponse.data;
		}

		let prompt = `berikan roasting singkat dengan kejam dan menyindir dalam bahasa gaul untuk profile github berikut : ${username}. Berikut detailnya: "${JSON.stringify(datas)}"`;

		if (datas.location && !datas.location.includes("Indonesia")) {
			prompt = `give a short and harsh roasting for the following github profile: ${username}. Here are the details: "${JSON.stringify(datas)}"`;
		}

		if (readmeContent) {
			prompt += `, Profile Markdown: \`\`\`${readmeContent}\`\`\``;
		} else {
			prompt += ", Profile Markdown: Not Found";
		}

		if (!datas.location || datas.location.includes("Indonesia")) {
			prompt +=
				". (berikan response dalam bahasa indonesia dan jangan berikan pujian atau saran serta jangan berikan kata-kata terlalu kasar)";
		} else {
			prompt +=
				". (provide the response in English and do not provide praise or advice and do not use explicit words)";
		}

		const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
		const result = await model.generateContent(prompt);
		const response = await result.response;

		res.json({
			roasting: response.text(),
			avatar_url: datas.avatar_url,
		});
	} catch (error) {
		console.log(error);
		if (error instanceof GoogleGenerativeAIResponseError) {
			return res
				.status(500)
				.json({
					error: "Layanan AI tidak tersedia saat ini. Silakan coba lagi nanti.",
				});
		}
		if (error.response && error.response.status === 404) {
			return res
				.status(404)
				.json({ error: "Pengguna GitHub tidak ditemukan." });
		}
		res
			.status(500)
			.json({ error: "Terjadi kesalahan internal. Silakan coba lagi nanti." });
	}
});

// Bersihkan data rate limiting yang sudah kadaluarsa setiap jam
setInterval(
	() => {
		const now = Date.now();
		for (const [ip, data] of rateLimitStore.entries()) {
			if (now - data.windowStart > 10 * 60 * 1000) {
				rateLimitStore.delete(ip);
			}
		}
	},
	60 * 60 * 1000,
); // Jalankan setiap jam

const port = process.env.PORT || 3001;
app.listen(port, () => {
	console.log(`Web berjalan di port ${port}`);
});
