import type { PrismaConfigInternal } from '@prisma/config'
import { arg, Command, format, HelpError, isError, loadEnvFile } from '@prisma/internals'
import { ArgError } from 'arg'
import { bold, dim, red } from 'kleur/colors'

import { executeSeedCommand, getSeedCommandFromPackageJson } from '../utils/seed'

export class DbSeed implements Command {
  public static new(): DbSeed {
    return new DbSeed()
  }

  private static help = format(`
${process.platform === 'win32' ? '' : '🙌  '}Seed your database

${bold('Usage')}

  ${dim('$')} prisma db seed [options]

${bold('Options')}

  -h, --help   Display this help message
    --config   Custom path to your Prisma config file

${bold('Examples')}

  Passing extra arguments to the seed command
    ${dim('$')} prisma db seed -- --arg1 value1 --arg2 value2
`)

  public async parse(argv: string[], config: PrismaConfigInternal): Promise<string | Error> {
    const args = arg(
      argv,
      {
        '--help': Boolean,
        '-h': '--help',
        '--schema': String,
        '--config': String,
        '--telemetry-information': String,
      },
      false,
    )

    if (isError(args)) {
      if (args instanceof ArgError && args.code === 'ARG_UNKNOWN_OPTION') {
        throw new Error(`${args.message}
Did you mean to pass these as arguments to your seed script? If so, add a -- separator before them:
${dim('$')} prisma db seed -- --arg1 value1 --arg2 value2`)
      }
      return this.help(args.message)
    }

    if (args['--help']) {
      return this.help()
    }

    await loadEnvFile({ schemaPath: args['--schema'], printMessage: true, config })

    const seedCommandFromPrismaConfig = config.migrations?.seed
    const seedCommandFromPkgJson = await getSeedCommandFromPackageJson(process.cwd())

    const seedCommand = seedCommandFromPrismaConfig ?? seedCommandFromPkgJson

    if (!seedCommand) return ``

    // We pass the extra params after a -- separator
    // Example: db seed -- --custom-param
    // Then args._ will be ['--custom-param']
    const extraArgs = args._.join(' ')

    // Seed command is set
    // Execute user seed command
    const successfulSeeding = await executeSeedCommand({ commandFromConfig: seedCommand, extraArgs })
    if (successfulSeeding) {
      return `\n${process.platform === 'win32' ? '' : '🌱  '}The seed command has been executed.`
    } else {
      process.exit(1)
    }
  }

  public help(error?: string): string | HelpError {
    if (error) {
      return new HelpError(`\n${bold(red(`!`))} ${error}\n${DbSeed.help}`)
    }
    return DbSeed.help
  }
}
