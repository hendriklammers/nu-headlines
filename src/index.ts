import Parser from 'rss-parser'
import ora from 'ora'
import inquirer from 'inquirer'

const parser = new Parser()
const spinner = ora({
  color: 'white',
  text: 'Loading rss feed',
}).start()

const main = async () => {
  const feed = await parser.parseURL('https://www.nu.nl/rss/Algemeen')
  spinner.stop()

  if (feed.items) {
    const choices = feed.items.map((item, index) => {
      return {
        name: item.title as string,
        value: item.link as string,
        short: item.content as string,
      }
    })

    inquirer.prompt([
      {
        type: 'rawlist',
        name: 'headlines',
        message: 'Select headline',
        choices,
        pageSize: 100,
      },
    ])

    // console.log(headlines.join('\n') + '\n')
  }
}

main().catch(console.error)
