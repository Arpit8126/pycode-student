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
  }
}
