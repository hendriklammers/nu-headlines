import Parser, { Items } from 'rss-parser'
import ora from 'ora'
import inquirer from 'inquirer'
import opn from 'opn'

interface FeedItem {
  title: string
  link: string
}

interface Choice {
  name: string
  value: string
}

const feedToChoices = (feed: Items): Promise<Choice[]> => {
  return new Promise((resolve, reject) => {
    if (feed.items) {
      const choices = feed.items.map((item: FeedItem, index: number) => {
        return {
          name: item.title,
          value: item.link,
        }
      })
      resolve(choices)
    } else {
      reject('No feed items available')
    }
  })
}

const main = async () => {
  const spinner = ora({
    color: 'white',
    text: 'Loading rss feed',
  }).start()
  const parser = new Parser()
  const feed = await parser.parseURL('https://www.nu.nl/rss/Algemeen')
  spinner.stop()
  const choices = await feedToChoices(feed)
  const answer: { url: string } = await inquirer.prompt([
    {
      type: 'rawlist',
      name: 'url',
      message: 'Select headline',
      choices,
      pageSize: 100,
    },
  ])
  opn(answer.url)
  process.exit()
}

main().catch(console.error)
