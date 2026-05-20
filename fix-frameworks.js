const fs = require('fs');
const path = require('path');

function fixAlias(targetPath) {
  if (!fs.existsSync(targetPath)) return;

  const stat = fs.lstatSync(targetPath);

  if (stat.isSymbolicLink()) {
    const realPath = fs.realpathSync(targetPath);

    console.log(`Fixing alias: ${targetPath}`);

    fs.rmSync(targetPath, { recursive: true, force: true });
    fs.cpSync(realPath, targetPath, { recursive: true });
  }
}

exports.default = async function (context) {
  const frameworkPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
    'Contents',
    'Frameworks',
    'Electron Framework.framework'
  );

  console.log('Fixing Electron Framework aliases...');

  // ✅ Fix ALL problematic aliases
  fixAlias(path.join(frameworkPath, 'Electron Framework'));
  fixAlias(path.join(frameworkPath, 'Helpers'));
  fixAlias(path.join(frameworkPath, 'Libraries'));
  fixAlias(path.join(frameworkPath, 'Resources'));

  console.log('✅ Framework fix completed');
};
``