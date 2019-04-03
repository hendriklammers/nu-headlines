#!/usr/bin/env node
import Parser, { Items } from 'rss-parser'
import readline from 'readline'
import ora from 'ora'
import opn from 'opn'
import axios from 'axios'
import cheerio from 'cheerio'
import chalk from 'chalk'

interface NewsItem {
  title: string
  index: string
  link: string
}

const feedToItems = (feed: Items): Promise<NewsItem[]> => {
  return new Promise((resolve, reject) => {
    if (feed.items) {
      const choices = feed.items.map(
        ({ title, link }: NewsItem, index: number) => {
          return {
            title,
            index: `${index + 1}`,
            link,
          }
        }
      )
      resolve(choices)
    } else {
      reject('No feed items available')
    }
  })
}

const getArticle = async (url: string): Promise<string> => {
  const res = await axios.get(url)
  return new Promise((resolve, reject) => {
    if (res.status === 200) {
      const $ = cheerio.load(res.data)
      const content: string[] = []
      const heads = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
      $('.block.article-body .block-content')
        .children()
        .each((i, elem) => {
          if (heads.includes(elem.tagName)) {
            content.push('\n' + chalk.cyan($(elem).text()))
          } else if (elem.tagName === 'p') {
            content.push($(elem).text())
          }
        })
      resolve('\n' + content.join('\n'))
    } else {
      reject(`Unable to get article content: ${res.status} ${res.statusText}`)
    }
  })
}

const inlineMode = (argv: string[]): boolean =>
  argv.slice(2).some(arg => ['-I', '-i', '--inline', '-inline'].includes(arg))

const showList = (list: NewsItem[]) => {
  const output = list.map(({ title, index }) => `${index}) ${title}`).join('\n')
  process.stdout.write(`\n${output}\n`)
}

const promptQuestion = (list: NewsItem[]): Promise<NewsItem> =>
  new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    const question = () => {
      rl.question('\nSelect an article (q to exit): ', answer => {
        if (answer === 'q') {
          rl.close()
          process.exit()
        } else {
          const index = parseInt(answer, 10)
          if (index > 0 && index <= list.length) {
            rl.close()
            resolve(list[index - 1])
          } else {
            question()
          }
        }
      })
    }
    question()
  })

const main = async () => {
  const spinner = ora({
    color: 'white',
    text: 'Loading rss feed',
  }).start()
  const parser = new Parser()
  const feed = await parser.parseURL('https://www.nu.nl/rss/Algemeen')
  spinner.stop()
  const items = await feedToItems(feed)
  showList(items)
  const { link } = await promptQuestion(items)

  // Open in browser by default
  if (!inlineMode(process.argv)) {
    opn(link)
    process.exit()
  }

  spinner.start('Loading article')
  const article = await getArticle(link)
  // TODO: Come up with a solution when the linked article is a video
  spinner.stop()
  process.stdout.write(`${article}\n`)
  process.exit()
}

main().catch(console.error)
