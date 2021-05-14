"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstanceUrl = void 0;
const vscode = require("vscode");
const execa = require("execa");
const url = require("url");
const constants_1 = require("../constants");
const token_service_1 = require("../services/token_service");
const log_1 = require("../log");
const git_remote_parser_1 = require("../git/git_remote_parser");
const git_extension_wrapper_1 = require("../git/git_extension_wrapper");
function fetch(cmd, workspaceFolder) {
    return __awaiter(this, void 0, void 0, function* () {
        const [, ...args] = cmd.trim().split(' ');
        const { stdout } = yield execa(git_extension_wrapper_1.gitExtensionWrapper.gitBinaryPath, args, {
            cwd: workspaceFolder,
            preferLocal: false,
        });
        return stdout;
    });
}
function fetchGitRemoteUrls(workspaceFolder) {
    return __awaiter(this, void 0, void 0, function* () {
        const fetchGitRemotesVerbose = () => __awaiter(this, void 0, void 0, function* () {
            const output = yield fetch('git remote -v', workspaceFolder);
            return (output || '').split('\n');
        });
        const parseRemoteFromVerboseLine = (line) => {
            // git remote -v output looks like
            // origin[TAB]git@gitlab.com:gitlab-org/gitlab-vscode-extension.git[WHITESPACE](fetch)
            // the interesting part is surrounded by a tab symbol and a whitespace
            return line.split(/\t| /)[1];
        };
        const remotes = yield fetchGitRemotesVerbose();
        const remoteUrls = remotes.map(remote => parseRemoteFromVerboseLine(remote)).filter(Boolean);
        // git remote -v returns a (fetch) and a (push) line for each remote,
        // so we need to remove duplicates
        return [...new Set(remoteUrls)];
    });
}
function intersectionOfInstanceAndTokenUrls(workspaceFolder) {
    return __awaiter(this, void 0, void 0, function* () {
        const uriHostname = (uri) => { var _a; return (_a = git_remote_parser_1.parseGitRemote(uri)) === null || _a === void 0 ? void 0 : _a.host; };
        const instanceUrls = token_service_1.tokenService.getInstanceUrls();
        const gitRemotes = yield fetchGitRemoteUrls(workspaceFolder);
        const gitRemoteHosts = gitRemotes.map(uriHostname);
        return instanceUrls.filter(instanceUrl => gitRemoteHosts.includes(url.parse(instanceUrl).host || undefined));
    });
}
function heuristicInstanceUrl(workspaceFolder) {
    return __awaiter(this, void 0, void 0, function* () {
        // if the intersection of git remotes and configured PATs exists and is exactly
        // one hostname, use it
        const intersection = yield intersectionOfInstanceAndTokenUrls(workspaceFolder);
        if (intersection.length === 1) {
            const heuristicUrl = intersection[0];
            log_1.log(`Found ${heuristicUrl} in the PAT list and git remotes, using it as the instanceUrl`);
            return heuristicUrl;
        }
        if (intersection.length > 1) {
            log_1.log(`Found more than one intersection of git remotes and configured PATs, ${intersection}`);
        }
        return null;
    });
}
function getInstanceUrl(workspaceFolder) {
    return __awaiter(this, void 0, void 0, function* () {
        // FIXME: if you are touching this configuration statement, move the configuration to get_extension_configuration.ts
        const { instanceUrl } = vscode.workspace.getConfiguration('gitlab');
        // if the workspace setting exists, use it
        if (instanceUrl) {
            return instanceUrl;
        }
        // legacy logic in GitLabService might not have the workspace folder available
        // in that case we just skip the heuristic
        if (workspaceFolder) {
            // try to determine the instance URL heuristically
            const heuristicUrl = yield heuristicInstanceUrl(workspaceFolder);
            if (heuristicUrl) {
                return heuristicUrl;
            }
        }
        // default to Gitlab cloud
        return constants_1.GITLAB_COM_URL;
    });
}
exports.getInstanceUrl = getInstanceUrl;
//# sourceMappingURL=get_instance_url.js.map