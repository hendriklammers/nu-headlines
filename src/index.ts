import Parser from 'rss-parser'
import ora from 'ora'

const parser = new Parser()
const spinner = ora({
  color: 'white',
  text: 'Loading rss feed',
}).start()

const main = async () => {
  const feed = await parser.parseURL('https://www.nu.nl/rss/Algemeen')
  spinner.stop()

  if (feed.items) {
    const headlines = feed.items.map((item, index) => {
      return index + ' ' + item.title
    })
    console.log(headlines.join('\n') + '\n')
  }
}

main().catch(console.error)
