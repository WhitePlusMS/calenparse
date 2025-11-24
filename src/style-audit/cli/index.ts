/**
 * CLI入口点
 */

import { runAudit } from "./run-audit";

const projectRoot = process.argv[2] || process.cwd();

runAudit(projectRoot).catch((error) => {
	console.error("发生错误:", error);
	process.exit(1);
});
