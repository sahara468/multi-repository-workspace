import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';
import { statusCommand } from './commands/status.js';
import { branchCommand } from './commands/branch.js';
import { checkoutCommand } from './commands/checkout.js';
import { serviceCommand } from './commands/service.js';
import { resetCommand } from './commands/reset.js';

const program = new Command();

program
  .name('mrw')
  .description('Multi-Repository Workspace CLI')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(syncCommand);
program.addCommand(statusCommand);
program.addCommand(branchCommand);
program.addCommand(checkoutCommand);
program.addCommand(serviceCommand);
program.addCommand(resetCommand);

program.parse();
