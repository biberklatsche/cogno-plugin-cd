const fspromise =  require('fs/promises');
const os = require('os');

let cacheTime;
let cache = undefined;
const maxCacheInMillis = 60 * 1000;

function createHash(inputString) {
    let hash = 0;
    if (inputString.length === 0) {
        return hash.toString(10);
    }
    for (let i = 0; i < inputString.length; i++) {
        const char = inputString.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash &= hash; // Ensure 32-bit signed integer
    }
    return hash.toString(10);
}

function parseArguments(input) {
    const cdArgument = input.replace(/cd\s/g, '').trim();
    const splittedArguments = cdArgument.split('/');
    const search =  splittedArguments[splittedArguments.length - 1].trim();
    const dirs =  splittedArguments.length > 1 ? splittedArguments.splice(0, splittedArguments.length - 1) : [];
    return {search, dirs};
}

function isLinuxSubsystem(dirs) {
    return os.platform() === 'win32' && dirs[0] == 'mnt';
}

function constructSearchDir(dirsA, dirsB) {
    const d = isLinuxSubsystem(dirsA) ? dirsA.slice(1) : dirsA;
    const directories = [...d,  ...dirsB];
    if(os.platform() === 'win32') {
        const drive = directories[0];
        const path = directories.reduce((a, v, currentIndex) => currentIndex === 0 ? '' : (currentIndex > 1 ? a : '') + (currentIndex > 1 ? '\\' : '') + v.replace(' ', '` '), '');
        return `${drive}:\\${path}`;
    } else {
        return directories.reduce((a, v, currentIndex) => a + '/' + v.replace(' ', '\\ '), '');
    }
}

function constructCommand(dirs, directoryName, pathStyleWindows) {
    const directories = [...dirs,  directoryName];
    if(pathStyleWindows) {
        return `cd ${directories.reduce((a, v, currentIndex) =>  a + (currentIndex > 0 ? '\\' : '') + v.replace(' ', '` '), '')}\\`;
    } else {
        return `cd ${directories.reduce((a, v, currentIndex) =>  a + (currentIndex > 0 ? '/' : '') + v.replace(' ', '\\ '), '')}/`;
    }
}

async function suggest(data) {
    const argument = parseArguments(data.input);
    const searchDir = constructSearchDir(data.directories, argument.dirs);
    if(!cache || Date.now() - cacheTime > maxCacheInMillis){
        cache = {};
        cacheTime = Date.now();
    }
    const hash = createHash(searchDir);
    let dirNames;
    if(!!cache[hash]) {
        dirNames = cache[hash];
    } else {
        dirNames = (await fspromise.readdir(searchDir, { withFileTypes: true }))
            .filter(file => file.isDirectory()).map(directory => directory.name);
        cache[hash] = dirNames;
    }
    return dirNames
        .filter(dirname => dirname.toLowerCase().startsWith(argument.search.toLowerCase()))
        .map(directory => {
            const label = directory;
            const command = constructCommand(argument.dirs, directory, data.location.shellType.toLowerCase().startsWith('powershell'));
            return {label, command};
        });
}

module.exports = {suggest};
