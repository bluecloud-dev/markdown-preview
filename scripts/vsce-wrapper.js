const os = require('node:os');

if (os.cpus().length === 0) {
  os.cpus = () => [
    {
      model: 'unknown',
      speed: 0,
      times: {
        user: 0,
        nice: 0,
        sys: 0,
        idle: 0,
        irq: 0,
      },
    },
  ];
}

require('@vscode/vsce/out/main')(process.argv);
