// Deterministic pseudo-random number generator to ensure consistent dataset generation
function createRandom(seed: number) {
  let state = seed
  return function () {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

export interface DatasetItem {
  name: string
  description: string
  headers: string[]
  csv: string
}

// 1. Generate dirty_store_transactions.csv (150 rows)
function generateDirtyStoreTransactions(): string {
  const rand = createRandom(42)
  const headers = [
    'TransactionID',
    'Date',
    'CustomerID',
    'CustomerAge',
    'ProductCategory',
    'ProductName',
    'Quantity',
    'UnitPrice',
    'Discount',
    'PaymentMethod',
    'Profit',
    'SatisfactionRating'
  ]

  const categories = ['Electronics', 'Clothing', 'Home & Kitchen', 'Office Supplies', 'Sports']
  const products: Record<string, string[]> = {
    'Electronics': ['Smartphone', 'Laptop', 'Headphones', 'Smartwatch', 'Bluetooth Speaker'],
    'Clothing': ['T-Shirt', 'Jeans', 'Jacket', 'Sneakers', 'Socks'],
    'Home & Kitchen': ['Blender', 'Coffee Maker', 'Toaster', 'Air Fryer', 'Vacuum Cleaner'],
    'Office Supplies': ['Desk Chair', 'Notebook', 'Gel Pens', 'File Organizer', 'Desk Lamp'],
    'Sports': ['Yoga Mat', 'Dumbbells', 'Water Bottle', 'Running Shoes', 'Backpack']
  }

  const paymentMethods = ['Credit Card', 'Debit Card', 'Cash', 'PayPal']
  const rows: string[] = [headers.join(',')]

  for (let i = 1; i <= 739; i++) {
    // Systematic duplicates: row 25 and 26 are exact duplicates of row 24
    let id = 10000 + i
    let currentRand = rand()
    
    // Determine category
    let category = categories[Math.floor(rand() * categories.length)]
    let originalCategory = category
    // Inconsistent category names (noise)
    if (currentRand < 0.05) category = '  ' + category + ' '
    else if (currentRand < 0.1) category = category.toLowerCase()
    else if (currentRand < 0.12) category = category.toUpperCase()
    else if (currentRand < 0.15) category = category === 'Office Supplies' ? 'Office' : category === 'Electronics' ? 'Elec.' : category

    // Determine product
    const prodList = products[originalCategory]
    let product = prodList[Math.floor(rand() * prodList.length)]

    // Customer ID & Age
    let customerId = `C${1000 + Math.floor(rand() * 500)}`
    let age: string | number = Math.floor(18 + rand() * 58) // 18 to 75
    // Age anomalies: nulls and outliers
    if (rand() < 0.08) age = '' // Missing
    else if (rand() < 0.02) age = 150 // Extreme outlier
    else if (rand() < 0.02) age = -5 // Invalid outlier
    else if (rand() < 0.02) age = 'NaN' // String null representation

    // Date variations
    let dateStr = ''
    const year = 2026
    const month = Math.floor(1 + rand() * 4) // Jan to Apr
    const day = Math.floor(1 + rand() * 28)
    const mStr = month < 10 ? `0${month}` : `${month}`
    const dStr = day < 10 ? `0${day}` : `${day}`

    let dateRand = rand()
    if (dateRand < 0.7) {
      dateStr = `${year}-${mStr}-${dStr}` // ISO
    } else if (dateRand < 0.8) {
      dateStr = `${dStr}/${mStr}/${year}` // European / slash
      if (rand() < 0.3) dateStr = `${mStr}/${dStr}/${year}` // Inconsistent US format
    } else if (dateRand < 0.9) {
      dateStr = `${year}/${mStr}/${dStr}` // ISO Slash
    } else if (dateRand < 0.95) {
      dateStr = `${year}-${mStr}-${dStr} 14:30:00` // Datetime
    } else {
      dateStr = '' // Missing date
    }

    // Quantity and Unit Price
    let qty: string | number = Math.floor(1 + rand() * 5)
    if (rand() < 0.05) qty = '' // Missing qty
    else if (rand() < 0.02) qty = -1 // Outlier
    else if (rand() < 0.02) qty = 100 // Outlier bulk purchase

    let basePrice = 15.0
    if (originalCategory === 'Electronics') basePrice = 150.0 + rand() * 600
    else if (originalCategory === 'Clothing') basePrice = 20.0 + rand() * 80
    else if (originalCategory === 'Home & Kitchen') basePrice = 30.0 + rand() * 200
    else if (originalCategory === 'Office Supplies') basePrice = 5.0 + rand() * 40
    else if (originalCategory === 'Sports') basePrice = 10.0 + rand() * 150

    let unitPrice: string | number = parseFloat(basePrice.toFixed(2))
    if (rand() < 0.04) unitPrice = '' // Missing price
    else if (rand() < 0.02) unitPrice = 0 // Free item / outlier
    else if (rand() < 0.02) unitPrice = 9999.99 // Extreme pricing error

    // Discount
    let discount: string | number = 0.0
    let discRand = rand()
    if (discRand < 0.4) discount = 0.0
    else if (discRand < 0.6) discount = 0.05
    else if (discRand < 0.8) discount = 0.1
    else if (discRand < 0.9) discount = 0.2
    else discount = '' // Missing discount
    // Inconsistent percentage format
    if (typeof discount === 'number' && discount > 0 && rand() < 0.15) {
      discount = `${discount * 100}%`
    }

    // Payment Method
    let payMethod = paymentMethods[Math.floor(rand() * paymentMethods.length)]
    if (rand() < 0.05) payMethod = payMethod.toLowerCase()
    else if (rand() < 0.05) payMethod = payMethod.toUpperCase()
    else if (rand() < 0.05) payMethod = '  ' + payMethod + ' '

    // Profit
    let profit: string | number = ''
    if (qty !== '' && unitPrice !== '' && typeof qty === 'number' && typeof unitPrice === 'number') {
      const discVal = typeof discount === 'number' ? discount : typeof discount === 'string' && discount.endsWith('%') ? parseFloat(discount) / 100 : 0
      const totalCost = qty * unitPrice * (1 - discVal)
      // Profit is normally 20% to 40% of sales
      let p = totalCost * (0.2 + rand() * 0.2)
      if (rand() < 0.05) p = -p // Negative profit (loss) outlier
      profit = parseFloat(p.toFixed(2))
    }
    if (rand() < 0.05) profit = '' // Missing profit
    if (rand() < 0.01) profit = -5000.00 // Massive anomalous loss outlier

    // Satisfaction Rating (1 to 5)
    let rating: string | number = Math.floor(1 + rand() * 5)
    if (rand() < 0.12) rating = '' // Missing rating
    else if (rand() < 0.02) rating = 99 // Outlier rating
    else if (rand() < 0.02) rating = -1 // Outlier rating

    // Systematic duplicates: row 25 & 26 duplicate row 24, row 350 & 351 duplicate row 349, row 612 duplicates row 611
    if (i === 25 || i === 26) {
      rows.push(rows[24])
      continue
    }
    if (i === 350 || i === 351) {
      rows.push(rows[349])
      continue
    }
    if (i === 612) {
      rows.push(rows[611])
      continue
    }

    const row = [
      id,
      dateStr,
      customerId,
      age,
      category,
      product,
      qty,
      unitPrice,
      discount,
      payMethod,
      profit,
      rating
    ]
    rows.push(row.join(','))
  }

  return rows.join('\n')
}

// 2. Generate student_performance_factors.csv (150 rows)
function generateStudentPerformanceFactors(): string {
  const rand = createRandom(99)
  const headers = [
    'StudentID',
    'Gender',
    'StudyHours',
    'AttendanceRate',
    'SleepHours',
    'ScreenTime',
    'SchoolSupport',
    'InternetAccess',
    'ParentEducation',
    'ExamScore'
  ]

  const genders = ['Female', 'Male']
  const supportOptions = ['Yes', 'No', 'yes', 'NO', '  Yes']
  const internetOptions = ['Yes', 'No', 'N/A']
  const parentEdOptions = ['High School', 'College', 'University', 'Postgraduate', 'None']
  
  const rows: string[] = [headers.join(',')]

  for (let i = 1; i <= 543; i++) {
    const studentId = 20000 + i
    const gender = genders[Math.floor(rand() * genders.length)]
    
    // Core attributes for regression: StudyHours (0 to 30)
    let studyHours: string | number = parseFloat((rand() * 25).toFixed(1))
    if (rand() < 0.06) studyHours = '' // missing study hours
    
    // AttendanceRate (50 to 100)
    let attendanceRate: string | number = parseFloat((50 + rand() * 50).toFixed(1))
    if (rand() < 0.08) attendanceRate = '' // missing attendance
    
    // SleepHours (4 to 10)
    let sleepHours: string | number = parseFloat((4 + rand() * 6).toFixed(1))
    if (rand() < 0.06) sleepHours = ''

    // ScreenTime (0 to 12)
    let screenTime: string | number = parseFloat((rand() * 10).toFixed(1))
    if (rand() < 0.06) screenTime = ''

    // Support and Internet (categorical with formatting noise)
    let schoolSupport = supportOptions[Math.floor(rand() * supportOptions.length)]
    if (rand() < 0.05) schoolSupport = ''

    let internetAccess = internetOptions[Math.floor(rand() * internetOptions.length)]
    if (rand() < 0.05) internetAccess = ''

    let parentEducation = parentEdOptions[Math.floor(rand() * parentEdOptions.length)]
    if (rand() < 0.08) parentEducation = ''

    // Calculate ExamScore based on StudyHours and AttendanceRate to provide genuine statistical relationships
    let examScore: string | number = 0
    let sh = typeof studyHours === 'number' ? studyHours : 10 // default for missing
    let ar = typeof attendanceRate === 'number' ? attendanceRate : 85 // default for missing
    
    // Linear relationship with noise
    let baseScore = 30 + (sh * 1.6) + ((ar - 50) * 0.7) + (rand() * 15 - 7.5)
    baseScore = Math.max(0, Math.min(100, baseScore))
    examScore = Math.round(baseScore)

    // Infuse regression outliers
    if (i === 15) {
      studyHours = 28.5
      examScore = 12 // Studied hard, failed (negative outlier)
    } else if (i === 77) {
      studyHours = 0.5
      examScore = 99 // Didn't study, aced (positive outlier)
    } else if (i === 120) {
      examScore = 180 // Impossible score outlier
    } else if (i === 245) {
      studyHours = 29.0
      examScore = 5 // Negative outlier
    } else if (i === 388) {
      studyHours = 0.1
      examScore = 100 // Positive outlier
    } else if (i === 490) {
      examScore = -25 // Negative score outlier
    }

    const isOutlier = i === 15 || i === 77 || i === 120 || i === 245 || i === 388 || i === 490;
    if (rand() < 0.05 && !isOutlier) {
      examScore = '' // Missing score
    }

    const row = [
      studentId,
      gender,
      studyHours,
      attendanceRate,
      sleepHours,
      screenTime,
      schoolSupport,
      internetAccess,
      parentEducation,
      examScore
    ]
    rows.push(row.join(','))
  }

  return rows.join('\n')
}

// 3. Generate sensor_readings_noisy.csv (150 rows)
function generateSensorReadingsNoisy(): string {
  const rand = createRandom(12345)
  const headers = ['Timestamp', 'SensorID', 'Temperature', 'Humidity', 'Pressure', 'Status']
  const sensors = ['SENSOR_A', 'SENSOR_B']
  const statuses = ['Active', 'Warning', 'Error', 'active', 'ACTIVE', '  Active ', 'Err']
  
  const rows: string[] = [headers.join(',')]
  
  // Base date: 2026-08-01 00:00:00
  let currentHour = 0
  
  for (let i = 1; i <= 812; i++) {
    // Generate date and time incrementing hour by hour
    const date = new Date(2026, 7, 1) // Aug 1, 2026
    date.setHours(date.getHours() + currentHour)
    currentHour++

    let timestampStr = ''
    let dateRand = rand()
    
    // Inconsistent datetime formats
    const yr = date.getFullYear()
    const mo = String(date.getMonth() + 1).padStart(2, '0')
    const dy = String(date.getDate()).padStart(2, '0')
    const hr = String(date.getHours()).padStart(2, '0')
    const mn = String(date.getMinutes()).padStart(2, '0')
    const sc = String(date.getSeconds()).padStart(2, '0')

    if (dateRand < 0.75) {
      timestampStr = `${yr}-${mo}-${dy} ${hr}:${mn}:${sc}` // ISO format
    } else if (dateRand < 0.85) {
      timestampStr = `${yr}/${mo}/${dy} ${hr}:${mn}` // Slash format
    } else if (dateRand < 0.95) {
      timestampStr = `${yr}-${mo}-${dy}T${hr}:${mn}:${sc}Z` // ISO-T format
    } else {
      timestampStr = '' // Missing timestamp
    }

    const sensorId = sensors[Math.floor(rand() * sensors.length)]
    
    // Temperature: Diurnal variation (peaking at 14:00)
    const hourVal = date.getHours()
    const rad = ((hourVal - 8) * Math.PI) / 12
    const baseTemp = 24.0 + 6.0 * Math.sin(rad) // Peak 30C, Trough 18C
    let temperature: string | number = parseFloat((baseTemp + (rand() * 3.0 - 1.5)).toFixed(1))
    
    // Humidity: Inversely correlated with temperature
    const baseHum = 60.0 - 15.0 * Math.sin(rad) // Trough 45%, Peak 75%
    let humidity: string | number = parseFloat((baseHum + (rand() * 6.0 - 3.0)).toFixed(1))
    
    // Pressure: around 1013 hPa
    let pressure: string | number = parseFloat((1011.0 + rand() * 4.0).toFixed(2))

    // Inject outliers & nulls
    if (i === 42) {
      temperature = -99.0 // Sensor frozen outlier
      humidity = 0.0
      pressure = 500.0 // Faulty reading
    } else if (i === 95) {
      temperature = 85.6 // Heat spike outlier
    } else if (i === 342) {
      temperature = -99.0 // Sensor frozen outlier
      humidity = 0.0
      pressure = 480.0 // Faulty reading
    } else if (i === 615) {
      pressure = 1099.90 // Surge outlier
    }

    const isOutlier = i === 42 || i === 95 || i === 342 || i === 615;
    if (rand() < 0.08 && !isOutlier) temperature = ''
    if (rand() < 0.08 && i !== 42 && i !== 342) humidity = ''
    if (rand() < 0.08 && i !== 42 && i !== 342 && i !== 615) pressure = ''

    let status = statuses[Math.floor(rand() * statuses.length)]
    if (rand() < 0.05) status = ''

    const row = [
      timestampStr,
      sensorId,
      temperature,
      humidity,
      pressure,
      status
    ]
    rows.push(row.join(','))
  }

  return rows.join('\n')
}

function generateStoreDimCustomers(): string {
  const rand = createRandom(101)
  const headers = ['CustomerID', 'SignupDate', 'VIP_Tier', 'Region', 'LifetimePoints']
  const vipTiers = ['Bronze', 'Silver', 'Gold', 'Platinum']
  const regions = ['North', 'East', 'West', 'South', 'Central']
  const rows: string[] = [headers.join(',')]

  // We want to generate ~350 customer IDs.
  // Let's create a pool of unique CustomerIDs
  const idPool: string[] = []
  // Let's seed the pool with IDs from C1000 to C1499 (transactions pull from this range)
  // Let's make sure some IDs are outside the transaction pool (e.g., C1500 to C1600) to test outer joins
  for (let id = 1000; id < 1550; id++) {
    idPool.push(`C${id}`)
  }

  // Shuffle pool deterministically
  for (let i = idPool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idPool[i], idPool[j]] = [idPool[j], idPool[i]]
  }

  // Select 350 unique customer IDs
  const activeIds = idPool.slice(0, 350)
  // Sort them so they look like a clean database dimension table
  activeIds.sort()

  for (let i = 0; i < activeIds.length; i++) {
    const custId = activeIds[i]

    // SignupDate
    const yr = 2021 + Math.floor(rand() * 5) // 2021 to 2025
    const mo = String(1 + Math.floor(rand() * 12)).padStart(2, '0')
    const dy = String(1 + Math.floor(rand() * 28)).padStart(2, '0')
    let signupDate: string = `${yr}-${mo}-${dy}`
    if (rand() < 0.05) signupDate = '' // missing

    // VIP Tier
    let vip = vipTiers[Math.floor(rand() * vipTiers.length)]
    if (rand() < 0.1) vip = '' // No VIP tier
    else if (rand() < 0.05) vip = vip.toLowerCase() // noise

    // Region
    let reg = regions[Math.floor(rand() * regions.length)]
    if (rand() < 0.05) reg = '' // missing
    else if (rand() < 0.05) reg = '  ' + reg + ' ' // spacing noise

    // LifetimePoints
    let points: string | number = Math.floor(rand() * 15000)
    if (rand() < 0.06) points = '' // missing
    else if (rand() < 0.02) points = -100 // negative outlier
    else if (rand() < 0.02) points = 999999 // excessive points outlier

    const row = [custId, signupDate, vip, reg, points]
    rows.push(row.join(','))
  }

  return rows.join('\n')
}

function generateCorporateFinancialsWide(): string {
  const rand = createRandom(2022)
  const headers = [
    'Company', 'Year',
    'Q1_Revenue', 'Q1_Profit',
    'Q2_Revenue', 'Q2_Profit',
    'Q3_Revenue', 'Q3_Profit',
    'Q4_Revenue', 'Q4_Profit'
  ]
  const companies = [
    'TechCorp', 'RetailGiant', 'BioPharma', 'EnergyFlow', 'AutoWorks',
    'FoodWay', 'FinanceTrust', 'CloudNine', 'GreenPower', 'HeavyMetal',
    'GlobalLogistics', 'SpaceLaunch', 'MediaNet', 'SafeGuard', 'SmartHome'
  ]
  const rows: string[] = [headers.join(',')]

  // 15 companies over years 2012 to 2025 (14 years).
  // Some companies started later, e.g. CloudNine in 2018, SpaceLaunch in 2016.
  for (const company of companies) {
    let startYear = 2012
    if (company === 'CloudNine') startYear = 2018
    else if (company === 'SpaceLaunch') startYear = 2016
    else if (company === 'SmartHome') startYear = 2015

    for (let yr = startYear; yr <= 2025; yr++) {
      // Base revenue scale for the company
      let scale = 100
      if (company === 'TechCorp') scale = 800
      else if (company === 'RetailGiant') scale = 1500
      else if (company === 'SpaceLaunch') scale = 50
      else if (company === 'EnergyFlow') scale = 1200

      // Add Year growth
      const growthMultiplier = 1 + (yr - startYear) * 0.08
      const baseRev = scale * growthMultiplier

      const quarterlyData: (string | number)[] = [company, yr]

      for (let q = 1; q <= 4; q++) {
        // Seasonality variation
        const season = q === 4 ? 1.3 : q === 1 ? 0.9 : 1.0
        let rev = baseRev * season * (0.85 + rand() * 0.3)
        let profitMargin = 0.05 + rand() * 0.15 // 5% to 20%
        if (company === 'TechCorp') profitMargin += 0.08
        if (company === 'FinanceTrust') profitMargin += 0.12
        if (company === 'SpaceLaunch') profitMargin -= 0.10 // heavy losses early on

        let profit = rev * profitMargin

        // Format to 2 decimal places
        let revVal: string | number = parseFloat(rev.toFixed(2))
        let profitVal: string | number = parseFloat(profit.toFixed(2))

        // Inject nulls & anomalies
        if (yr === 2025 && q === 4 && rand() < 0.8) {
          // Q4 2025 not closed yet for many companies
          revVal = ''
          profitVal = ''
        } else {
          if (rand() < 0.04) revVal = ''
          if (rand() < 0.04) profitVal = ''
          // Extreme outliers
          if (rand() < 0.005) profitVal = -1000.00 // heavy audit correction loss
          if (rand() < 0.005) revVal = 0.00 // error
        }

        quarterlyData.push(revVal)
        quarterlyData.push(profitVal)
      }

      rows.push(quarterlyData.join(','))
    }
  }

  return rows.join('\n')
}

function generateHighFrequencyStockTicks(): string {
  const rand = createRandom(777)
  const headers = ['Timestamp', 'Ticker', 'Price', 'Volume']
  const tickers = ['AAPL', 'TSLA', 'MSFT']
  const basePrices: Record<string, number> = { 'AAPL': 180.00, 'TSLA': 240.00, 'MSFT': 350.00 }
  const currentPrices = { ...basePrices }
  
  const rows: string[] = [headers.join(',')]
  
  // Date: Aug 3, 2026, starting at market open 09:30:00.000
  let currentTimeMs = new Date(2026, 7, 3, 9, 30, 0).getTime()

  for (let i = 1; i <= 620; i++) {
    // Increment time by 200ms to 3000ms (high frequency ticks)
    const timeStep = Math.floor(200 + rand() * 2800)
    currentTimeMs += timeStep

    const dateObj = new Date(currentTimeMs)
    const yr = dateObj.getFullYear()
    const mo = String(dateObj.getMonth() + 1).padStart(2, '0')
    const dy = String(dateObj.getDate()).padStart(2, '0')
    const hr = String(dateObj.getHours()).padStart(2, '0')
    const mn = String(dateObj.getMinutes()).padStart(2, '0')
    const sc = String(dateObj.getSeconds()).padStart(2, '0')
    const ms = String(dateObj.getMilliseconds()).padStart(3, '0')
    // Generate microsecond format timestamp (very common in high frequency trading logs)
    const microsec = String(Math.floor(rand() * 1000)).padStart(3, '0')
    const timestampStr = `${yr}-${mo}-${dy} ${hr}:${mn}:${sc}.${ms}${microsec}`

    // Select a ticker randomly
    const ticker = tickers[Math.floor(rand() * tickers.length)]
    
    // Calculate random walk price step
    const volatility = ticker === 'TSLA' ? 0.002 : 0.0008
    const priceChangePercent = (rand() * 2 - 1) * volatility
    currentPrices[ticker] = currentPrices[ticker] * (1 + priceChangePercent)
    
    let price: string | number = parseFloat(currentPrices[ticker].toFixed(4))
    let volume: string | number = Math.floor(100 + rand() * 4900)

    // Inject outliers & gaps
    if (i === 150 && ticker === 'TSLA') {
      price = price * 1.05 // sudden 5% surge (volatility outlier)
    } else if (i === 320 && ticker === 'AAPL') {
      price = price * 0.94 // sudden 6% crash (volatility outlier)
    } else if (i === 480) {
      price = 0.00 // pricing error
    }

    if (rand() < 0.04) price = '' // missing price tick
    if (rand() < 0.05) volume = '' // missing volume tick

    const row = [timestampStr, ticker, price, volume]
    rows.push(row.join(','))
  }

  return rows.join('\n')
}

// 7. Generate financial_transactions_part1.csv & financial_transactions_part2.csv (1000 rows split)
function generateFinancialTransactionsData(part: 1 | 2): string {
  const rand = createRandom(42)
  const headers = ['TransactionID', 'Date', 'CustomerID', 'MerchantType', 'TransactionAmount']
  const rows = [headers.join(',')]
  
  const merchants = ['Retail', 'Food', 'Travel', 'Entertainment', 'Services', '']
  
  const startIdx = part === 1 ? 1 : 501
  const endIdx = part === 1 ? 500 : 1000
  
  const ids: string[] = []
  for (let i = 1; i <= 1000; i++) {
    ids.push(`T${10000 + i}`)
  }
  
  const randDup = createRandom(99)
  for (let i = 0; i < 50; i++) {
    const src = Math.floor(randDup() * 1000)
    const dst = Math.floor(randDup() * 1000)
    ids[dst] = ids[src]
  }

  for (let i = startIdx; i <= endIdx; i++) {
    const id = ids[i - 1]
    const month = Math.floor(1 + rand() * 4)
    const day = Math.floor(1 + rand() * 28)
    const mStr = month < 10 ? `0${month}` : `${month}`
    const dStr = day < 10 ? `0${day}` : `${day}`
    const dateStr = `2026-${mStr}-${dStr} 12:00:00`
    
    let merchant = merchants[Math.floor(rand() * merchants.length)]
    if (merchant && rand() < 0.15) {
      if (rand() < 0.5) merchant = '  ' + merchant.toLowerCase() + ' '
      else merchant = merchant.toUpperCase()
    }
    
    let amount = ''
    if (rand() > 0.1) {
      amount = (5.0 + rand() * 495.0).toFixed(2)
    }
    
    rows.push([id, dateStr, `C${1000 + Math.floor(rand() * 500)}`, merchant, amount].join(','))
  }
  return rows.join('\n')
}

// 8. Generate customer_churn_dirty.csv
function generateCustomerChurnDirty(): string {
  const rand = createRandom(101)
  const headers = ['CustomerID', 'Age', 'Tenure', 'Segment', 'Churn']
  const rows = [headers.join(',')]
  
  const segments = ['Premium', 'Standard', 'Basic', '  ', '?', 'Premium ', 'Basic  ', '']
  
  const ids: string[] = []
  for (let i = 1; i <= 400; i++) {
    ids.push(`C${20000 + i}`)
  }
  
  const randDup = createRandom(202)
  for (let i = 0; i < 20; i++) {
    const src = Math.floor(randDup() * 400)
    const dst = Math.floor(randDup() * 400)
    ids[dst] = ids[src]
  }
  
  for (let i = 1; i <= 400; i++) {
    const id = ids[i - 1]
    let age = ''
    if (rand() > 0.05) {
      age = Math.floor(18 + rand() * 63).toString()
    } else {
      age = '?'
    }
    
    let tenure = ''
    if (rand() > 0.15) {
      tenure = Math.floor(1 + rand() * 72).toString()
    }
    
    const segment = segments[Math.floor(rand() * segments.length)]
    const churn = rand() > 0.7 ? '1' : '0'
    
    rows.push([id, age, tenure, segment, churn].join(','))
  }
  return rows.join('\n')
}

// 9. Generate iot_telemetry_corrupt.csv
function generateIotTelemetryCorrupt(): string {
  const rand = createRandom(303)
  const headers = ['Timestamp', 'DeviceID', 'Temperature', 'Humidity']
  const rows = [headers.join(',')]
  
  const devices = ['D-01', 'D-02', 'D-03']
  const timestamps: string[] = []
  let currentSec = 1792711200
  for (let i = 0; i < 300; i++) {
    const date = new Date((currentSec + i) * 1000)
    timestamps.push(date.toISOString().replace('T', ' ').substring(0, 19))
  }
  
  const randDup = createRandom(404)
  for (let i = 0; i < 15; i++) {
    const src = Math.floor(randDup() * 300)
    const dst = Math.floor(randDup() * 300)
    timestamps[dst] = timestamps[src]
  }
  
  for (let i = 0; i < 300; i++) {
    const timestamp = timestamps[i]
    const device = devices[Math.floor(rand() * devices.length)]
    
    let temp = ''
    if (rand() > 0.12) {
      temp = (20.0 + rand() * 15.0).toFixed(1)
    }
    
    let hum = ''
    if (rand() > 0.08) {
      hum = (40.0 + rand() * 30.0).toFixed(1)
    } else {
      hum = 'Error'
    }
    
    rows.push([timestamp, device, temp, hum].join(','))
  }
  return rows.join('\n')
}

// 10. Generate healthcare_demographics_raw.csv
function generateHealthcareDemographicsRaw(): string {
  const rand = createRandom(505)
  const headers = ['PatientHash', 'Age', 'BloodPressure', 'StayDuration', 'DiseaseCategory', 'SeverityGrade']
  const rows = [headers.join(',')]
  
  const diseases = ['Cardiology', 'Oncology', 'Pediatrics', 'Neurology']
  const severities = ['Mild', 'Moderate', 'Severe', '']
  
  const hashes: string[] = []
  for (let i = 0; i < 250; i++) {
    hashes.push(`HASH_${1000 + Math.floor(rand() * 1000)}`)
  }
  
  const randDup = createRandom(606)
  for (let i = 0; i < 15; i++) {
    const src = Math.floor(randDup() * 250)
    const dst = Math.floor(randDup() * 250)
    hashes[dst] = hashes[src]
  }
  
  for (let i = 0; i < 250; i++) {
    const hash = hashes[i]
    let age = ''
    if (rand() > 0.10) {
      age = Math.floor(1 + rand() * 95).toString()
    }
    
    let bp = ''
    if (rand() > 0.15) {
      bp = Math.floor(90 + rand() * 70).toString()
    }
    
    let stay = ''
    if (rand() > 0.08) {
      stay = Math.floor(1 + rand() * 30).toString()
    }
    
    const disease = diseases[Math.floor(rand() * diseases.length)]
    const severity = severities[Math.floor(rand() * severities.length)]
    
    rows.push([hash, age, bp, stay, disease, severity].join(','))
  }
  return rows.join('\n')
}

// 11. Generate logistics_tracking_dirty.csv
function generateLogisticsTrackingDirty(): string {
  const rand = createRandom(707)
  const headers = ['TrackingNumber', 'ShipDate', 'TransitDays', 'ShippingTier', 'CarrierName']
  const rows = [headers.join(',')]
  
  const tiers = ['Express', 'Standard', 'Economy']
  const carriers = ['FedEx', 'UPS', 'DHL', '']
  
  const trackNums: string[] = []
  for (let i = 0; i < 200; i++) {
    trackNums.push(`TRK${Math.floor(500000 + rand() * 100000)}`)
  }
  
  const randDup = createRandom(808)
  for (let i = 0; i < 10; i++) {
    const src = Math.floor(randDup() * 200)
    const dst = Math.floor(randDup() * 200)
    trackNums[dst] = trackNums[src]
  }
  
  for (let i = 0; i < 200; i++) {
    const track = trackNums[i]
    const date = new Date(1772366400000 + i * 86400000)
    const dateStr = date.toISOString().substring(0, 10)
    
    let transit = ''
    if (rand() > 0.15) {
      transit = Math.floor(1 + rand() * 14).toString()
    }
    
    const tier = tiers[Math.floor(rand() * tiers.length)]
    const carrier = carriers[Math.floor(rand() * carriers.length)]
    
    rows.push([track, dateStr, transit, tier, carrier].join(','))
  }
  return rows.join('\n')
}

// 12. Generate branch_quarterly_revenue.csv
function generateBranchQuarterlyRevenue(): string {
  const rand = createRandom(909)
  const headers = ['BranchName', 'Q1', 'Q2', 'Q3', 'Q4', 'StdDev']
  const rows = [headers.join(',')]
  
  for (let i = 1; i <= 50; i++) {
    const branch = `Branch_${i}`
    const q1 = Math.round(50000 + rand() * 450000)
    const q2 = Math.round(60000 + rand() * 490000)
    const q3 = Math.round(55000 + rand() * 465000)
    const q4 = Math.round(70000 + rand() * 530000)
    const stdDev = Math.round(5000 + rand() * 25000)
    
    rows.push([branch, q1, q2, q3, q4, stdDev].join(','))
  }
  return rows.join('\n')
}

export const DEFAULT_DATASETS: Record<string, DatasetItem> = {
  'dirty_store_transactions.csv': {
    name: 'dirty_store_transactions.csv',
    description: 'Retail transactions with duplicate rows, inconsistent categories/dates/payments, missing sales fields, and outliers (e.g. negative prices, impossible customer ages, and extreme losses). Ideal for drop_duplicates, fillna, dropna, str.strip, pd.to_datetime, and category encoding.',
    headers: [
      'TransactionID', 'Date', 'CustomerID', 'CustomerAge', 'ProductCategory', 'ProductName',
      'Quantity', 'UnitPrice', 'Discount', 'PaymentMethod', 'Profit', 'SatisfactionRating'
    ],
    csv: generateDirtyStoreTransactions()
  },
  'student_performance_factors.csv': {
    name: 'student_performance_factors.csv',
    description: 'Correlated dataset examining StudyHours, AttendanceRate, SleepHours, ScreenTime, and ExamScore. Contains statistical outliers (high study + low score, and low study + high score) and inconsistent categorical variables. Excellent for regression plotting, correlation heatmaps, groupby aggregates, and boxplots.',
    headers: [
      'StudentID', 'Gender', 'StudyHours', 'AttendanceRate', 'SleepHours', 'ScreenTime',
      'SchoolSupport', 'InternetAccess', 'ParentEducation', 'ExamScore'
    ],
    csv: generateStudentPerformanceFactors()
  },
  'sensor_readings_noisy.csv': {
    name: 'sensor_readings_noisy.csv',
    description: 'Time-series logs from IoT sensors displaying cyclic diurnal temperature and humidity readings. Includes random noise, sensor dropouts (nulls), extreme hardware spikes (e.g., -99.0C temperature), and inconsistent time formats. Perfect for pd.to_datetime, rolling mean smoothing, resample aggregation, and line charts.',
    headers: ['Timestamp', 'SensorID', 'Temperature', 'Humidity', 'Pressure', 'Status'],
    csv: generateSensorReadingsNoisy()
  },
  'store_dim_customers.csv': {
    name: 'store_dim_customers.csv',
    description: 'Relational dimension table for customers. Contains CustomerID (matching dirty_store_transactions.csv), signup date, VIP tier rating, regional assignment, and lifetime reward points. Excellent for testing inner/left/right/outer joins, lookup merging, and missing customer validations.',
    headers: ['CustomerID', 'SignupDate', 'VIP_Tier', 'Region', 'LifetimePoints'],
    csv: generateStoreDimCustomers()
  },
  'corporate_financials_wide.csv': {
    name: 'corporate_financials_wide.csv',
    description: 'Wide-formatted table of corporate quarterly revenues and profits over multiple years (2012-2025). Ideal for wide-to-long reshaping operations, including pd.melt(), stacking/unstacking, multi-indices, and hierarchical aggregation.',
    headers: ['Company', 'Year', 'Q1_Revenue', 'Q1_Profit', 'Q2_Revenue', 'Q2_Profit', 'Q3_Revenue', 'Q3_Profit', 'Q4_Revenue', 'Q4_Profit'],
    csv: generateCorporateFinancialsWide()
  },
  'high_frequency_stock_ticks.csv': {
    name: 'high_frequency_stock_ticks.csv',
    description: 'Dense millisecond/microsecond high-frequency tick log for stock symbols AAPL, TSLA, and MSFT. Contains quick price shifts, volume ticks, missing updates, and extreme trading volatility ticks. Perfect for resampling to OHLC candlesticks, rolling volatility windows, and sub-second datetime indexing.',
    headers: ['Timestamp', 'Ticker', 'Price', 'Volume'],
    csv: generateHighFrequencyStockTicks()
  },
  'financial_transactions_part1.csv': {
    name: 'financial_transactions_part1.csv',
    description: 'First fragment of high-volume financial transactions ledger with network retry ID duplicates, whitespace issues, and missing fields. Used to test sequential chunk parsing and preprocessing.',
    headers: ['TransactionID', 'Date', 'CustomerID', 'MerchantType', 'TransactionAmount'],
    csv: generateFinancialTransactionsData(1)
  },
  'financial_transactions_part2.csv': {
    name: 'financial_transactions_part2.csv',
    description: 'Second fragment of high-volume financial transactions ledger with network retry ID duplicates, whitespace issues, and missing fields.',
    headers: ['TransactionID', 'Date', 'CustomerID', 'MerchantType', 'TransactionAmount'],
    csv: generateFinancialTransactionsData(2)
  },
  'customer_churn_dirty.csv': {
    name: 'customer_churn_dirty.csv',
    description: 'Dirty customer loyalty and churn tracking ledger with trailing whitespace labels, non-standard missing cells (?), and multi-device login duplicates. Ideal for multivariate analysis.',
    headers: ['CustomerID', 'Age', 'Tenure', 'Segment', 'Churn'],
    csv: generateCustomerChurnDirty()
  },
  'iot_telemetry_corrupt.csv': {
    name: 'iot_telemetry_corrupt.csv',
    description: 'Industrial IoT telemetry data with overlapping timestamp anomalies, system reboot duplicates, and corrupted sensor logs. Excellent for hybrid forward-fill/median imputation pipelines.',
    headers: ['Timestamp', 'DeviceID', 'Temperature', 'Humidity'],
    csv: generateIotTelemetryCorrupt()
  },
  'healthcare_demographics_raw.csv': {
    name: 'healthcare_demographics_raw.csv',
    description: 'Messy demographic tracking data of hospitalized patients containing duplicate PatientHash signatures, and missing critical health indexes stratified by disease categories.',
    headers: ['PatientHash', 'Age', 'BloodPressure', 'StayDuration', 'DiseaseCategory', 'SeverityGrade'],
    csv: generateHealthcareDemographicsRaw()
  },
  'logistics_tracking_dirty.csv': {
    name: 'logistics_tracking_dirty.csv',
    description: 'Supply chain shipment delay database with irregular date formats, tracking ID duplicates, and missing carriers or transit days. Perfect for group-wise delays visualization.',
    headers: ['TrackingNumber', 'ShipDate', 'TransitDays', 'ShippingTier', 'CarrierName'],
    csv: generateLogisticsTrackingDirty()
  },
  'branch_quarterly_revenue.csv': {
    name: 'branch_quarterly_revenue.csv',
    description: 'Quarterly branch revenue summary database tracking Q1-Q4 metrics for 50 global offices. Contains branch-specific variance statistics (StdDev) for advanced bar charts.',
    headers: ['BranchName', 'Q1', 'Q2', 'Q3', 'Q4', 'StdDev'],
    csv: generateBranchQuarterlyRevenue()
  },
  'budget_2026.xlsx': {
    name: 'budget_2026.xlsx',
    description: 'Regional corporate spreadsheet compiling multiple regional financial budget sheets (North, South, East) with differing headers and project ID duplicates. (Binary spreadsheet, preview loads live from Pyodide).',
    headers: ['ProjID', 'Dept', 'Budget'],
    csv: ''
  },
  'retail_inventory_merged.xlsx': {
    name: 'retail_inventory_merged.xlsx',
    description: 'Inventory levels Excel ledger featuring merged cells for category names, formatting errors, blank count records, and duplicate SKUs. (Binary spreadsheet, preview loads live from Pyodide).',
    headers: ['Category', 'SKU', 'StockQuantity', 'StockStatus'],
    csv: ''
  },
  'employee_performance_irregular.xlsx': {
    name: 'employee_performance_irregular.xlsx',
    description: 'HR appraisals ledger structured with irregular metadata rows at the top, duplicate employee codes, and missing scoring slots. (Binary spreadsheet, preview loads live from Pyodide).',
    headers: ['EmployeeID', 'Dept', 'AppraisalScore', 'EmploymentType'],
    csv: ''
  },
  'property_appraisals_corrupt.xlsx': {
    name: 'property_appraisals_corrupt.xlsx',
    description: 'Real estate appraisals sheet with missing valuations, duplicate properties, and text string currency columns (e.g. $1,200,000). (Binary spreadsheet, preview loads live from Pyodide).',
    headers: ['PropertyID', 'ZipCode', 'Price', 'SquareFootage'],
    csv: ''
  },
  'smart_meter_consumption.xlsx': {
    name: 'smart_meter_consumption.xlsx',
    description: 'Multi-index power load logs of smart utility meters containing missing hourly reading blocks and timestamp synchronization duplicates. (Binary spreadsheet, preview loads live from Pyodide).',
    headers: ['MeterID', 'Timestamp', 'PowerLoad_kW'],
    csv: ''
  }
}
