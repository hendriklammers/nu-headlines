#!/usr/bin/env node
import readline from 'readline'
import ora from 'ora'
import opn from 'opn'
import axios from 'axios'
import cheerio from 'cheerio'
import chalk from 'chalk'
import url from 'url'

interface NewsItem {
  title: string
  article: string
}

const getArticle = async ({ article, title }: NewsItem): Promise<string> => {
  const res = await axios.get(article)
  return new Promise((resolve, reject) => {
    if (res.status === 200) {
      const $ = cheerio.load(res.data)
      const content: string[] = [chalk.cyan(title) + '\n']
      const heads = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
      // TODO: Better text formatting
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
      rl.question('\nSelect an article (q to quit): ', answer => {
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
    const article = url.resolve('https://www.nu.nl', link)
    items.push({ title, article })
  }
}

const getHeadlines = async (link: string): Promise<NewsItem[]> => {
  const res = await axios.get(link)
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

      $('.block.articlelist .section-nu.source-normal li').each((i, elem) => {
        // .subtitle contains Video, Podcast, In beeld etc.
        if (
          $(elem)
            .find('.subtitle')
            .text().length
        ) {
          return
        }
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
  const selected = await promptQuestion(items)

  // Open in browser by default
  if (!inlineMode(process.argv)) {
    opn(selected.article)
    process.exit()
  }

  spinner.start('Loading article')
  const articleText = await getArticle(selected)
  spinner.stop()
  process.stdout.write(`${articleText}\n`)
  process.exit()
}

main().catch(console.error)
