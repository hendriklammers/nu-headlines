#!/usr/bin/env node
import readline from 'readline'
import ora from 'ora'
import opn from 'opn'
import axios from 'axios'
import cheerio from 'cheerio'
import chalk from 'chalk'
import path from 'path'

interface NewsItem {
  title: string
  url: string
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
  const output = list
    .map(({ title }, index) => `${index + 1}) ${title}`)
    .join('\n')
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

const addItem = (
  items: NewsItem[],
  title: string | undefined,
  link: string | undefined
) => {
  if (title && link) {
    const url = path.join('https://www.nu.nl', link)
    items.push({ title, url })
  }
}

const getHeadlines = async (url: string): Promise<NewsItem[]> => {
  const res = await axios.get(url)
  return new Promise((resolve, reject) => {
    if (res.status === 200) {
      const $ = cheerio.load(res.data)
      const items: NewsItem[] = []
      const headline = $('.block.headline.section-nu > a')
      addItem(
        items,
        $('.block.headline.section-nu > a h1.title').text(),
        $('.block.headline.section-nu > a').attr('href')
      )

      // TODO: Filter out video and podcast
      $('.block.articlelist .section-nu.source-normal li').each((i, elem) => {
        addItem(
          items,
          $(elem)
            .find('.title')
            .text(),
          $(elem)
            .find('>a')
            .attr('href')
        )
      })
      resolve(items)
    } else {
      reject(`Unable to get article content: ${res.status} ${res.statusText}`)
    }
  })
}

const main = async () => {
  const spinner = ora({
    color: 'white',
    text: 'Loading news',
  }).start()
  const items = await getHeadlines('https://www.nu.nl')
  spinner.stop()
  showList(items)
  const { url } = await promptQuestion(items)

  // Open in browser by default
  if (!inlineMode(process.argv)) {
    opn(url)
    process.exit()
  }

  spinner.start('Loading article')
  const article = await getArticle(url)
  // TODO: Come up with a solution when the linked article is a video
  spinner.stop()
  process.stdout.write(`${article}\n`)
  process.exit()
}

main().catch(console.error)
