﻿import RaidModel from "../models/raidModel.js";
import UserModel from "../models/userModel.js";
import userModel from "../models/userModel.js";
import validateJwtToken from "../security/jwtTokenValidator.js";

function mapRaidEndpoints(app) {
	app.get("/getRaids", async (request, response) => {
		try {
			const raids = await RaidModel.find({});
			response.status(200);
			response.send(raids);

			console.log("GET:", raids);
		} catch (error) {
			response.status(500);
			response.send("Something went wrong processing the request.");
			console.error("getRaidsError:", error);
		}
	});

	app.post("/addRaid", validateJwtToken, async (request, response) => {
		try {
			const newUsers = request.body.users.sort().map((user) => user.toLowerCase());
			const newRaid = new RaidModel({
				users: newUsers,
				raid: request.body.raid,
				timestamp: request.body.timestamp,
			});

			// Gets last raid that the same team completed
			let lastRaid = null;
			await RaidModel.findOne({users: newUsers}, null, {
				sort: {timestamp: -1},
			}).then((res) => {
				lastRaid = res;
			});

			if (lastRaid == null) {
				await newRaid.save().then(() => {
					// Add users to db and increase aspect counter by 0.5
					newRaid.users.forEach((user) => {
						userModel.updateOne({user: user}, {$inc: {aspects: 0.5}}, {upsert: true}).then((res) => {
							console.log(user, "got 0.5 aspects");
						});
					});
					response.send({err: ""});
				});
			} else {
				// If the last raid was registered less
				// than 10 seconds ago and it's players
				// are the same as this one, then it's
				// likely to be the same raid.
				const timeDiff = Math.abs(newRaid.timestamp - lastRaid.timestamp);
				if (timeDiff < 10000) {
					response.send({err: "duplicate raid"});
					return;
				}

				await newRaid.save().then(() => {
					// Add users to db and increase aspect counter by 0.5
					newRaid.users.forEach((user) => {
						userModel.updateOne({user: user}, {$inc: {aspects: 0.5}}, {upsert: true}).then((res) => {
							console.log(user, "got 0.5 aspects");
						});
					});
					response.send({err: ""});
				});
			}
		} catch (error) {
			response.status(500);
			response.send({err: "something went wrong"});

			console.error("postRaidError:", error);
		}
	});
}

export default mapRaidEndpoints;
