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

// ganti bagian ini menjadi all cors agar bisa berjalan lokal
// const app = express();
// const options = [
// 	cors({
// 		origin: "*",
// 		methods: "*",
// 		allowedHeaders: ["Content-Type", "Authorization"],
// 		credentials: true,
// 	}),
// ];
// sesuaikan juga cors ini
app.use(cors(corsOptions));
app.use(bodyParser.json());

async function fetchGitHubData(username) {
	let headerGithub = {};
	if (process.env.GITHUB_TOKEN != null) {
		headerGithub = {
			Authorization: `token ${process.env.GITHUB_TOKEN}`,
		};
	}

	let profileResponse, repoResponse, readmeResponse;

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

		const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
		const result = await model.generateContent(prompt);
		const response = await result.response;

		res.json({
			roasting: response.text(),
			avatar_url: datas.avatar_url,
		});
	} catch (error) {
		console.log(error);
		if (error instanceof GoogleGenerativeAIResponseError) {
			return res.status(500).json({ error: error.message });
		}
		res.status(500).json({ error: error.message });
	}
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
	console.log(`Web berjalan di port ${port}`);
});
