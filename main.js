const fspromise =  require('fs/promises');
const os = require('os');
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
        const path = directories.reduce((a, v, currentIndex) => (currentIndex > 1 ? a : '') + (currentIndex > 1 ? '\\' : '') + v.replace(' ', '` '), '');
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
    const argument = parseArguments(data.currentInput.input);
    const searchDir = constructSearchDir(data.directory, argument.dirs);
    return (await fspromise.readdir(searchDir, { withFileTypes: true }))
        .filter(file => file.isDirectory() && file.name.toLowerCase().startsWith(argument.search.toLowerCase()))
        .map(directory => {
            const label = directory.name;
            const command = constructCommand(argument.dirs, directory.name, data.location.shellType.toLowerCase().startsWith('powershell'));
            return {label, command};
        });
}

module.exports = {suggest};
