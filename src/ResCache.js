"use strict";

const req = require("request-promise-native");

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const { MarshalStream } = require("marshalutil");

const storage = {
	resIndexFile: "index_tq.txt",
	resFile: "resfileindex.txt",
	resDir: path.join(__dirname, "..", "res"),
	baseUrl: "http://res.eveonline.ccpgames.com",
	binariesUrl: "http://binaries.eveonline.com",
};

try { fs.mkdirSync(storage.resDir) } catch (e) {}

// TODO: init based build version, modular index

class ResCache {

	static getMap () {
		if (!storage.map)
			storage.map = new Map(
				[].concat(...[[storage.resIndexFile, storage.binariesUrl], [storage.resFile, storage.baseUrl]].map(([file, url]) => fs
					.readFileSync(path.join(__dirname, "..", file))
					.toString()
					.split("\n")
					.map(line => {
						let [k, v] = line.split(",").slice(0, 2);
						return [k, [v, url]];
					})
				))
			);
		return storage.map;
	}

	static async getByPath (pth) {
		const [fullPath, url] = ResCache.getMap().get(pth.toLowerCase());
		const localPath = fullPath.split("/");
		console.log(pth, localPath);
		if (!fs.existsSync(path.join(storage.resDir, ...localPath))) {
			try { fs.mkdirSync(path.join(storage.resDir, localPath[0])) } catch (e) {}
			const data = await req({ url: `${url}/${localPath.join("/")}`,  gzip: true, encoding: null });
			fs.writeFileSync(
				path.join(storage.resDir, ...localPath), 
				data,
			);
			return data;
		}
		return fs.readFileSync(path.join(storage.resDir, ...localPath));
	}

	static getPathsByExtension (ext) {
		return Array.from(ResCache.getMap()).map(([path]) => path.toLowerCase()).filter(path => path.endsWith(`.${ext}`));
	}

	static async loadYaml (pth) {
		const data = (await ResCache.getByPath(pth)).toString();
		return yaml.safeLoad(data.replace(new RegExp("!!python/tuple", "g"), ""));
	}

	static async loadBulk (bulkID) {
		return new MarshalStream(await ResCache.getByPath(`app:/bulkdata/${bulkID}.cache2`)).value;
	}

}

module.exports = ResCache;
