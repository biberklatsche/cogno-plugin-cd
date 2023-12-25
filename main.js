const path = require('path');
const fs = require('fs');
const fspromise =  require('fs/promises');
const os = require('os');
async function suggest(data) {
  if(os.platform() === 'win32') {
    data.directory[0] = data.directory[0]+':'
  } else {
    data.directory.unshift('/');
  }
  const cdArgument = data.currentInput.input.replace(/cd\s/g, '').trim();
  const cdDir = cdArgument.split('/');
  const partFromCd = cdDir.length > 1 ? cdDir.splice(0, cdDir.length - 1) : [];
  console.log('###########', partFromCd);
  const currentDir = path.join(...data.directory, ...partFromCd);
  const partOfDirName = cdDir[cdDir.length - 1];
  return (await fspromise.readdir(currentDir, { withFileTypes: true }))
    .filter(file => file.isDirectory() && file.name.startsWith(partOfDirName))
    .map(directory => {
      const label = directory.name;
      const command = `cd ${partFromCd.length === 0 ? '' : path.join(...partFromCd) + '/'}${directory.name}/`;
      return {label, command};
    });
}

module.exports = {suggest};
