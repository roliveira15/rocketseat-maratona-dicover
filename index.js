const Modal = {
  title: document.querySelector('#modal-title'),
  editable: document.querySelector('#form'),
  optionsToggle: {
    'modal-wallets': () =>
      document
        .querySelector(`.modal-overlay.modal-wallets`)
        .classList.toggle('active'),
    transaction: () =>
      document
        .querySelector(`.modal-overlay.transaction`)
        .classList.toggle('active'),
    'menu-active': () =>
      document
        .querySelectorAll(`.menu-trs`)
        .forEach((element) => element.classList.toggle('active')),
    'filter-active': () =>
      document
        .querySelectorAll(`.filters`)
        .forEach((element) => element.classList.toggle('active')),
  },

  toggle(value) {
    this.optionsToggle[value]()
  },
}

const Storage = {
  get() {
    return (
      JSON.parse(localStorage.getItem(`dev.finances:wallets`)) || []
    )
  },

  set(wallets) {
    localStorage.setItem(
      `dev.finances:wallets`,
      JSON.stringify(wallets)
    )
  },
}

const Wallet = {
  all: Storage.get() || [],
  selected: Storage.get()[0] || Modal.toggle('modal-wallets'),
  index: 0,
  config: {
    darkMode: false,
  },

  update() {
    if (Wallet.all.length > 0)
      Wallet.all[Wallet.index] = {
        ...Wallet.selected,
        config: Wallet.config,
      }
    Storage.set(Wallet.all)
  },

  add(wallet) {
    if (!wallet.transactions) wallet.transactions = []

    Wallet.all.push(wallet)

    Storage.set(Wallet.all)
  },

  remove(index) {
    Wallet.all.splice(index, 1)
    App.reload()
  },

  select(index) {
    Modal.toggle('modal-wallets')

    Wallet.selected = Wallet.all[index]
    Wallet.config = Wallet.selected.config
    Transaction.all = Wallet.selected
    Transaction.filtered = { ...Wallet.selected }
    Wallet.index = index

    App.reload()
  },

  export() {
    const wallet = JSON.stringify(Wallet.selected)
    Utils.downloadFile(
      wallet,
      `wallet-${Wallet.selected?.name}.json`,
      'application/json'
    )
    return
  },

  extract() {
    const transactions = Transaction.all.transactions
    const incomes = Transaction.incomes()
    const expenses = Transaction.expenses()
    const total = Transaction.total()

    const currentDate = new Date()
    const date = currentDate.toLocaleDateString('pt-br')
    const time = currentDate.toLocaleTimeString('pt-br')

    let text = `Extrato - Data: ${`${date} - ${time}\n`}`
    text += transactions.reduce(
      (txt, transaction) =>
        (txt += `\n${transaction.date} - ${
          transaction.description
        }       ${Utils.formatCurrency(transaction.amount)}`),
      ''
    )
    text += `\n\nEntradas:        ${Utils.formatCurrency(incomes)}`
    text += `\nSaídas:          ${Utils.formatCurrency(expenses)}`
    text += `\nTotal:           ${Utils.formatCurrency(total)}`

    Utils.downloadFile(text, 'extrato.txt', 'application/text')
  },

  csv() {
    const transactions = Transaction.all.transactions
    const content =
      'Descrição, Saídas, Total\n' +
      transactions.reduce((acc, transaction) => {
        acc += `${transaction.description},"${Utils.formatCurrency(
          transaction.amount
        )}",${transaction.date}\n`
        return acc
      }, '')

    Utils.downloadFile(content, 'transactions.csv', 'application/csv')
  },
}

const Transaction = {
  all: Wallet.selected || [],
  filtered: { ...Wallet.selected },
  editableIndex: '',
  editableID: '',
  dates: [],
  filterOptions: {
    Year(transaction, value) {
      return (
        parseInt(transaction.date.split('/')[2]) ===
        parseInt(value.year)
      )
    },
    Month(transaction, value) {
      return (
        parseInt(transaction.date.split('/')[1]) ===
        parseInt(value.month)
      )
    },
    Day(transaction, value) {
      return (
        parseInt(transaction.date.split('/')[0]) ===
        parseInt(value.day)
      )
    },
    YearDay(transaction, value) {
      return (
        this.Day(transaction, value) && this.Year(transaction, value)
      )
    },
    YearMonth(transaction, value) {
      return (
        this.Month(transaction, value) &&
        this.Year(transaction, value)
      )
    },
    YearMonthDay(transaction, value) {
      return (
        this.Month(transaction, value) &&
        this.Year(transaction, value) &&
        this.Day(transaction, value)
      )
    },
    MonthDay(transaction, value) {
      return (
        this.Day(transaction, value) && this.Month(transaction, value)
      )
    },
  },

  add(transaction) {
    Transaction.all.transactions.push(transaction)
    App.reload()
  },

  update(index, filterIndex, transaction) {
    Transaction.all.transactions[index] = transaction
    Transaction.filtered.transactions[filterIndex] = transaction
    App.reload()
  },

  remove(id) {
    const index = Transaction.all.transactions.findIndex(
      (transactionIn) => transactionIn.id === id
    )
    Transaction.all.transactions.splice(index, 1)
    App.reload()
  },

  sortByDate(transactions, invert) {
    return transactions.sort((a, b) => {
      a = new Date(a.date.split('/').reverse().join('-'))
      b = new Date(b.date.split('/').reverse().join('-'))

      return invert ? (a > b ? -1 : 1) : a > b ? 1 : -1
    })
  },

  getDates() {
    const wallet = Wallet.selected?.transactions

    return wallet
      ? wallet.reduce((accumulator, transaction) => {
          if (!accumulator.includes(transaction.date))
            accumulator.push(transaction.date)

          return accumulator
        }, [])
      : ''
  },

  getYears() {
    return this.dates
      ? this.dates.reduce((accumulator, date) => {
          const year = date.split('/')[2]
          if (!accumulator.includes(year)) accumulator.push(year)
          return accumulator
        }, [])
      : ''
  },

  getMonthsInYear(year) {
    return this.dates
      ? this.dates.reduce((accumulator, date) => {
          const month = date.split('/')[1]
          if (
            !accumulator.includes(month) &&
            accumulator.includes(year)
          )
            accumulator.push(month)
          return accumulator.sort()
        }, [])
      : ''
  },

  getMonths() {
    return this.dates
      ? this.dates.reduce((accumulator, date) => {
          const month = date.split('/')[1]
          if (!accumulator.includes(month)) accumulator.push(month)
          return accumulator.sort()
        }, [])
      : ''
  },

  getDays() {
    return this.dates
      ? this.dates.reduce((accumulator, date) => {
          const day = date.split('/')[0]
          if (!accumulator.includes(day)) accumulator.push(day)
          return accumulator.sort()
        }, [])
      : ''
  },

  filter(option, value) {
    Transaction.filtered.transactions = Transaction.all.transactions.filter(
      (transaction) =>
        Transaction.filterOptions[option](transaction, value)
    )
    App.reload()
  },

  resetFilter() {
    Transaction.filtered.transactions = Transaction.all.transactions
    DOM.removeTagFilter()
    App.reload()
  },

  incomes(transactions = Transaction.all.transactions) {
    return transactions?.reduce(
      (total, { amount }) => (amount > 0 ? amount + total : total),
      0
    )
  },

  expenses(transactions = Transaction.all.transactions) {
    return transactions?.reduce(
      (total, { amount }) => (amount < 0 ? amount + total : total),
      0
    )
  },

  total(transactions = Transaction.all.transactions) {
    return transactions?.reduce(
      (total, { amount }) => amount + total,
      0
    )
  },
}

const DOM = {
  transactionsContainer: document.querySelector('#data-table tbody'),
  walletsContainer: document.querySelector('#wallets-table tbody'),
  language: 'pt-BR' || navigator.language,

  addWallet(wallet, index) {
    const tr = document.createElement('tr')

    tr.innerHTML = DOM.innerHTMLWallet(wallet, index)
    tr.dataset.index = index

    DOM.walletsContainer.appendChild(tr)
  },

  innerHTMLWallet(wallet, index) {
    const { name, transactions } = wallet

    const amount = transactions?.reduce(
      (current, next) => current + next.amount,
      0
    )

    const CSSClass = amount > 0 ? 'income' : 'expense'

    const newAmount = Utils.formatCurrency(amount)

    const html = `
    <td onclick="Wallet.select(${index})" class="name button">${name}</td>
    <td onclick="Wallet.select(${index})" class="${CSSClass} button">${newAmount}</td>
    <td>
      <img class="button" onclick="Wallet.remove(${index})" src="./assets/minus.svg" alt="Remover carteira">
    </td>
    `
    return html
  },

  addTransaction(transaction, index) {
    const tr = document.createElement('tr')
    tr.innerHTML = DOM.innerHTMLTransaction(transaction, index)
    tr.dataset.index = index

    DOM.transactionsContainer.appendChild(tr)
  },

  innerHTMLTransaction(transaction, index) {
    const { description, amount, date, id } = transaction

    const CSSClass = amount > 0 ? 'income' : 'expense'

    const newAmount = Utils.formatCurrency(amount)

    const html = `
    <td class="description">${description}</td>
    <td class="${CSSClass}">${newAmount}</td>
    <td call="date">${date}</td>
    <td>
      <a class="edit" onclick="DOM.editTransaction('${id}')" ></a>
    </td>
    <td>
      <a class="remove" onclick="Transaction.remove('${id}')" ></a>
    </td>
    `
    return html
  },

  setValuesInputFilterDate() {
    const years = Transaction.getYears() || ['2021']
    const months = Transaction.getMonths() || ['01']
    const days = Transaction.getDays() || ['01']

    const inputYear = document.querySelector('#input-year')
    const inputMonth = document.querySelector('#input-month')
    const inputDay = document.querySelector('#input-day')

    inputYear.innerHTML = ''
    inputMonth.innerHTML = ''
    inputDay.innerHTML = ''

    years.forEach((year) => {
      inputYear.innerHTML += `<option value="${year}">${year}</option>`
    })

    months.forEach((month) => {
      inputMonth.innerHTML += `<option value="${month}">${month}</option>`
    })

    days.forEach((day) => {
      inputDay.innerHTML += `<option value="${day}">${day}</option>`
    })
  },

  invertTheme(mediaText) {
    return mediaText.indexOf('dark') > -1
      ? ['dark', 'light']
      : ['light', 'dark']
  },

  loadTheme(darkMode) {
    const cssRules = window.document.styleSheets[0].cssRules

    for (const rule of cssRules) {
      let media = rule.media

      if (media) {
        const [currentTheme] = DOM.invertTheme(media.mediaText)
        const nextTheme = darkMode ? 'light' : 'dark'

        media.mediaText = media.mediaText.replace(
          '(prefers-color-scheme: ' + currentTheme + ')',
          '(prefers-color-scheme: ' + nextTheme + ')'
        )
      }
    }
  },

  switchTheme() {
    const cssRules = window.document.styleSheets[0].cssRules
    let darkMode = []

    for (const rule of cssRules) {
      let media = rule.media

      if (media) {
        const [currentTheme, nextTheme] = DOM.invertTheme(
          media.mediaText
        )
        darkMode.push(currentTheme)

        media.mediaText = media.mediaText.replace(
          '(prefers-color-scheme: ' + currentTheme + ')',
          '(prefers-color-scheme: ' + nextTheme + ')'
        )
      }
    }

    Wallet.selected.config.darkMode =
      darkMode[0] === 'dark' ? true : false

    Wallet.update()
  },

  addTagFilter(option) {
    const options = {
      date: 'data',
    }
    const filterSelected = document.querySelector('#filter-tag')
    filterSelected.innerHTML = `<div id="filter-selected"><span>${options[option]}</span><img class="button" onclick="Transaction.resetFilter()" src="./assets/cancel.svg" alt="Remover Filtro"></div>`
  },

  removeTagFilter() {
    const filterSelected = document.querySelector('#filter-tag')
    filterSelected.innerHTML = ''
  },

  editTransaction(id) {
    const index = Transaction.all.transactions.findIndex(
      (transactionIn) => transactionIn.id === id
    )

    const transaction = Transaction.all.transactions[index]
    transaction.date = transaction.date.split('/').reverse().join('-')

    Transaction.editableIndex = index
    Transaction.editableID = id

    Modal.title.innerText = 'Editar Transação'
    Modal.editable.setAttribute('data-editable', 'true')
    Form.setValues(transaction)
    Form.plotsDisabled()

    Modal.toggle('transaction')
  },

  updateBalance() {
    document.getElementById(
      'incomeDisplay'
    ).innerHTML = Utils.formatCurrency(Transaction.incomes())

    document.getElementById(
      'expenseDisplay'
    ).innerHTML = Utils.formatCurrency(Transaction.expenses())

    document.getElementById(
      'totalDisplay'
    ).innerHTML = Utils.formatCurrency(Transaction.total())
  },

  clearTransactions() {
    DOM.transactionsContainer.innerHTML = ''
  },

  clearWallets() {
    DOM.walletsContainer.innerHTML = ''
  },
}

const Utils = {
  formatAmount(value) {
    value = Number(value) * 100
    return Math.round(value)
  },

  formatDate(date) {
    return new Date(date).toLocaleDateString(DOM.language)
  },

  formatCurrency(value) {
    const signal = Number(value) < 0 ? '-' : ''

    value = String(value).replace(/\D/g, '')

    value = Number(value) / 100

    value = value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })

    return signal + value
  },

  downloadFile(data, name, type) {
    const blob = new Blob([data], {
      type: type,
    })
    const link = window.document.createElement('a')
    link.href = window.URL.createObjectURL(blob)
    link.download = `${name.trim().replace(/ +/g, '-')}`
    link.click()
    window.URL.revokeObjectURL(link.href)
    return
  },

  currentDate() {
    return new Date()
  },

  setMonthToDate(date, value) {
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()

    const currentMonth = new Date(year, month, 1)

    const nextMonth = new Date(currentMonth.setMonth(month + value))
    const daysInNextMonth = new Date(
      nextMonth.getFullYear(),
      nextMonth.getMonth() + 1,
      0
    ).getDate()

    return daysInNextMonth < day
      ? new Date(
          nextMonth.getFullYear(),
          nextMonth.getMonth(),
          daysInNextMonth
        )
      : new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day)
  },
}

const WalletForm = {
  name: document.querySelector('input#wallet-name'),

  getValues() {
    return { name: WalletForm.name.value }
  },

  validadeFields() {
    const { name } = WalletForm.getValues()
    if (name === '') {
      throw new Error('Por favor, preencha todos os campos.')
    }
  },

  formatValues() {
    let { name } = WalletForm.getValues()
    return {
      name: name.replace(/ +/g, ' ').trim(),
    }
  },

  saveWallet(wallet) {
    Wallet.add(wallet)
  },

  clearFields() {
    WalletForm.name.value = ''
  },

  submit(event) {
    event.preventDefault()
    try {
      WalletForm.validadeFields()
      const wallet = WalletForm.formatValues()
      WalletForm.saveWallet({ ...wallet, config: Wallet.config })

      WalletForm.clearFields()

      DOM.clearWallets()

      Wallet.all.forEach(DOM.addWallet)
    } catch (error) {
      alert(error.message)
    }
  },
}

const Form = {
  description: document.querySelector('input#description'),
  amount: document.querySelector('input#amount'),
  date: document.querySelector('input#date'),
  plots: document.querySelector('input#plots'),
  checkbox: document.getElementById('checkbox-plots'),

  getValues() {
    return {
      description: Form.description.value.replace(/ +/g, ' ').trim(),
      amount: Form.amount.value,
      date: Form.date.value,
      plots: Form.plots.value || 1,
    }
  },

  setValues({ description, amount, date, plots }) {
    Form.description.value = description
    Form.amount.value = amount / 100
    Form.date.value = date.split('/').reverse().join('-')
    Form.plots.value = plots
  },

  cancel(value) {
    Modal.toggle(value)
    Form.clearFields()
    Modal.editable.setAttribute('data-editable', 'false')
    Modal.title.innerText = 'Nova Transação'
    Form.plotsEnabled()
  },

  plotsDisabled() {
    Form.plots.setAttribute('disabled', 'disabled')
    Form.checkbox.setAttribute('disabled', 'disabled')
  },

  plotsEnabled() {
    Form.checkbox.removeAttribute('disabled')
  },

  validadeFields() {
    const { description, amount, date } = Form.getValues()
    if (
      description.trim() === '' ||
      amount.trim() === '' ||
      date.trim() === ''
    ) {
      throw new Error('Por favor, preencha todos os campos.')
    }
  },

  formatValues() {
    let { description, amount, date, plots } = Form.getValues()
    amount = Utils.formatAmount(amount)

    return {
      description,
      amount,
      date,
      plots,
    }
  },

  saveTransaction(transaction) {
    try {
      const date = new Date(transaction.date + 'T11:00:01')

      for (let i = 0; i < transaction.plots; i++) {
        const newDate = Utils.formatDate(
          Utils.setMonthToDate(date, i)
        )
        const id = (
          new Date(newDate).getTime() * new Date().getTime()
        ).toString(16)

        Transaction.add({ ...transaction, date: newDate, id })
      }
    } catch (error) {
      console.log(error)
    }
  },

  updateTransaction(index, id, transaction) {
    transaction.date = Utils.formatDate(
      new Date(transaction.date + 'T11:00:01')
    )

    const filterIndex = Transaction.filtered.transactions.findIndex(
      (transaction) => transaction.id === id
    )

    Transaction.update(index, filterIndex, {
      ...transaction,
      id,
    })
  },

  clearFields() {
    Form.description.value = ''
    Form.amount.value = ''
    Form.date.value = ''
    Form.plots.value = ''
    Form.checkbox.checked = false
  },

  setCurrentDate() {
    const currentDate = Utils.currentDate().toISOString().slice(0, 10)
    Form.date.value = currentDate
  },

  plotsInputState() {
    if (Form.checkbox.checked) {
      Form.plots.removeAttribute('disabled')
      Form.plots.placeholder = 'Adicione o numero de parcelas'
    } else {
      Form.plots.setAttribute('disabled', 'disabled')
      Form.plots.placeholder = 'Ativar parcelas'
    }
  },

  submit(event) {
    event.preventDefault()

    try {
      Form.validadeFields()
      const transaction = Form.formatValues()

      Modal.editable.attributes['data-editable'].value === 'true'
        ? Form.updateTransaction(
            Transaction.editableIndex,
            Transaction.editableID,
            transaction
          )
        : Form.saveTransaction(transaction)

      Form.clearFields()
      Form.setCurrentDate()

      Modal.toggle('transaction')
    } catch (error) {
      alert(error.message)
    }
  },
}

const FilterDateForm = {
  option: document.querySelector('#filter-options'),

  inputYear: document.querySelector('#input-year'),
  inputMonth: document.querySelector('#input-month'),
  inputDay: document.querySelector('#input-day'),

  checkboxYear: document.querySelector('#checkbox-year'),
  checkboxMonth: document.querySelector('#checkbox-month'),
  checkboxDay: document.querySelector('#checkbox-day'),

  getValues() {
    return {
      year: FilterDateForm.inputYear.value,
      month: FilterDateForm.inputMonth.value,
      day: FilterDateForm.inputDay.value,
    }
  },

  submit(event) {
    event.preventDefault()
    try {
      let option = ''
      if (FilterDateForm.checkboxYear.checked)
        option += FilterDateForm.checkboxYear.value
      if (FilterDateForm.checkboxMonth.checked)
        option += FilterDateForm.checkboxMonth.value
      if (FilterDateForm.checkboxDay.checked)
        option += FilterDateForm.checkboxDay.value

      const date = FilterDateForm.getValues()
      Transaction.filter(option, date)
      DOM.addTagFilter(FilterDateForm.option.value)

      Modal.toggle('filter-active')
    } catch (error) {
      alert('Selecione uma opção')
    }
  },
}

const App = {
  init() {
    Transaction.filtered.transactions?.forEach(DOM.addTransaction)
    Wallet.all.forEach(DOM.addWallet)

    DOM.updateBalance()

    Form.setCurrentDate()
    Transaction.dates = Transaction.getDates()
    DOM.setValuesInputFilterDate()

    DOM.loadTheme(Wallet.selected?.config?.darkMode)

    document.querySelector('#wallet-selected-name').innerHTML =
      Transaction.all?.name || 'Crie um Carteira'
  },

  reload() {
    DOM.clearTransactions()
    DOM.clearWallets()
    Wallet.update()
    Transaction.dates = Transaction.getDates()
    DOM.setValuesInputFilterDate()
    this.init()
  },
}

App.init()

document.addEventListener('click', (event) => {
  const modalTransactionActivated = event.target.matches(
    '.modal-overlay.transaction.active'
  )

  const modalWalletActivated = event.target.matches(
    '.modal-overlay.modal-wallets.active'
  )

  const modalMenuTransactionsActivated = event.target.matches(
    '.menu-trs.background-menu.active'
  )

  const modalFiltersTransactionsActivated = event.target.matches(
    '.filters.background-menu.active'
  )

  if (modalTransactionActivated) {
    Modal.toggle('transaction')
  }

  if (modalWalletActivated) {
    Modal.toggle('modal-wallets')
  }

  if (modalMenuTransactionsActivated) {
    Modal.toggle('menu-active')
  }

  if (modalFiltersTransactionsActivated) {
    Modal.toggle('filter-active')
  }
})
