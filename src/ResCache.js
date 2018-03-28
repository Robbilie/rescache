"use strict";

const req = require("request-promise-native");

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const { MarshalStream } = require("marshalutil");

const defaults = {
	binariesUrl: "http://binaries.eveonline.com",
	resfileUrl: "http://res.eveonline.ccpgames.com",
	resDir: path.join(__dirname, "..", "res"),
};

try { fs.mkdirSync(defaults.resDir) } catch (e) {}

class ResCache {

	constructor (buildVersion) {
		this.map = new Map([
			["app:/index.txt", [`eveonline_${buildVersion}.txt`, defaults.binariesUrl]],
		]);
	}

	async init () {
		const index = await this.getByPath("app:/index.txt");
		this.fillMap(
			this.parseIndex(index),
			defaults.binariesUrl,
		);
		const resfileindex = await this.getByPath("app:/resfileindex.txt");
		this.fillMap(
			this.parseIndex(resfileindex),
			defaults.resfileUrl,
		);
	}

	fillMap (lines, url) {
		lines.forEach(([name, path]) => {
			this.map.set(name, [path, url]);
		});
	}

	parseIndex (data) {
		return data
			.toString()
			.split("\n")
			.map(line => line.split(","));
	}

	async getByPath (pth) {
		const [fullPath, url] = this.map.get(pth.toLowerCase());
		const splitPath = fullPath.split("/");
		const localPath = path.join(defaults.resDir, ...splitPath);
		if (!fs.existsSync(localPath)) {
			if (splitPath.length > 1) {
				try {
					fs.mkdirSync(path.join(defaults.resDir, splitPath[0]));
				} catch (e) {}
			}
			const data = await req({ 
				url: `${url}/${fullPath}`,
				gzip: true,
				encoding: null,
			});
			fs.writeFileSync(
				localPath, 
				data,
			);
			return data;
		}
		return fs.readFileSync(localPath);
	}

	getPathsByExtension (ext) {
		return Array
			.from(this.map)
			.map(([path]) => path.toLowerCase())
			.filter(path => path.endsWith(`.${ext}`));
	}

	async loadYaml (pth) {
		const data = await this.getByPath(pth);
		const yamlStr = data
			.toString()
			.replace(new RegExp("!!python/tuple", "g"), "");
		return yaml.safeLoad(yamlStr);
	}

	async loadBulk (bulkID) {
		const data = await this.getByPath(`app:/bulkdata/${bulkID}.cache2`);
		return new MarshalStream(data).value;
	}

}

module.exports = ResCache;
