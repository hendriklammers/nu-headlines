#!/usr/bin/env node
import Parser, { Items } from 'rss-parser'
import ora from 'ora'
import inquirer from 'inquirer'
import opn from 'opn'
import axios from 'axios'
import cheerio from 'cheerio'
import chalk from 'chalk'

interface FeedItem {
  title: string
  link: string
}

interface Choice {
  name: string
  value: string
  link: string
}

const feedToChoices = (feed: Items): Promise<Choice[]> => {
  return new Promise((resolve, reject) => {
    if (feed.items) {
      const choices = feed.items.map(
        ({ title, link }: FeedItem, index: number) => {
          return {
            name: title,
            value: `${index + 1}`,
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
      resolve(content.join('\n'))
    } else {
      reject(`Unable to get article content: ${res.status} ${res.statusText}`)
    }
  })
}

const inlineMode = (argv: string[]): boolean =>
  argv.slice(2).some(arg => ['-I', '-i', '--inline', '-inline'].includes(arg))

const main = async () => {
  const spinner = ora({
    color: 'white',
    text: 'Loading rss feed',
  }).start()
  const parser = new Parser()
  const feed = await parser.parseURL('https://www.nu.nl/rss/Algemeen')
  spinner.stop()

  const choices = await feedToChoices(feed)
  const { selected } = await inquirer.prompt([
    {
      type: 'rawlist',
      name: 'selected',
      message: 'Read full article of selected headline: ',
      choices,
      pageSize: 100,
    },
  ])
  const link = choices[selected - 1].link

  // Open in browser by default
  if (!inlineMode(process.argv)) {
    process.stdout.write(`Opening in browser: ${link}\n`)
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
