export interface DatasetSchema {
  column: string
  type: string
  description: string
}

export interface DatasetSample {
  name: string
  description: string
  columns: DatasetSchema[]
  rows: any[]
}

export const DATASET_SAMPLES: Record<string, DatasetSample> = {
  'titanic.csv': {
    name: 'titanic.csv',
    description: 'Messy demographics and survival tracking of passengers aboard the Titanic.',
    columns: [
      { column: 'PassengerId', type: 'int64', description: 'Unique incremental passenger index' },
      { column: 'Survived', type: 'int64', description: 'Survival binary indicator (1 = Survived, 0 = Deceased)' },
      { column: 'Pclass', type: 'int64', description: 'Socioeconomic ticket class (1 = Upper, 2 = Middle, 3 = Lower)' },
      { column: 'Name', type: 'object/string', description: 'Full name and title of the passenger' },
      { column: 'Sex', type: 'object/string', description: 'Gender value (male or female)' },
      { column: 'Age', type: 'float64', description: 'Passenger age in years (contains 177 missing null values)' },
      { column: 'SibSp', type: 'int64', description: 'Count of siblings / spouses aboard the ship' },
      { column: 'Parch', type: 'int64', description: 'Count of parents / children aboard the ship' },
      { column: 'Ticket', type: 'object/string', description: 'Alphanumeric ticket number' },
      { column: 'Fare', type: 'float64', description: 'Cost of ticket passenger fare' },
      { column: 'Cabin', type: 'object/string', description: 'Cabin room identification (contains 687 null values)' },
      { column: 'Embarked', type: 'object/string', description: 'Port of embarkation: C=Cherbourg, Q=Queenstown, S=Southampton (2 nulls)' }
    ],
    rows: [
      { PassengerId: 1, Survived: 0, Pclass: 3, Name: 'Braund, Mr. Owen Harris', Sex: 'male', Age: 22.0, SibSp: 1, Parch: 0, Ticket: 'A/5 21171', Fare: 7.25, Cabin: null, Embarked: 'S' },
      { PassengerId: 2, Survived: 1, Pclass: 1, Name: 'Cumings, Mrs. John Bradley (Florence Briggs Thayer)', Sex: 'female', Age: 38.0, SibSp: 1, Parch: 0, Ticket: 'PC 17599', Fare: 71.28, Cabin: 'C85', Embarked: 'C' },
      { PassengerId: 3, Survived: 1, Pclass: 3, Name: 'Heikkinen, Miss. Laina', Sex: 'female', Age: 26.0, SibSp: 0, Parch: 0, Ticket: 'STON/O2. 3101282', Fare: 7.925, Cabin: null, Embarked: 'S' },
      { PassengerId: 4, Survived: 1, Pclass: 1, Name: 'Futrelle, Mrs. Jacques Heath (Lily May Peel)', Sex: 'female', Age: 35.0, SibSp: 1, Parch: 0, Ticket: '113803', Fare: 53.10, Cabin: 'C123', Embarked: 'S' },
      { PassengerId: 5, Survived: 0, Pclass: 3, Name: 'Allen, Mr. William Henry', Sex: 'male', Age: 35.0, SibSp: 0, Parch: 0, Ticket: '373450', Fare: 8.05, Cabin: null, Embarked: 'S' },
      { PassengerId: 6, Survived: 0, Pclass: 3, Name: 'Moran, Mr. James', Sex: 'male', Age: null, SibSp: 0, Parch: 0, Ticket: '330877', Fare: 8.458, Cabin: null, Embarked: 'Q' },
      { PassengerId: 7, Survived: 0, Pclass: 1, Name: 'McCarthy, Mr. Timothy J', Sex: 'male', Age: 54.0, SibSp: 0, Parch: 0, Ticket: '17463', Fare: 51.86, Cabin: 'E46', Embarked: 'S' }
    ]
  },
  'superstore.csv': {
    name: 'superstore.csv',
    description: 'Multilevel transaction dataset of retail sales, shipping logs, profit margin percentages, and products.',
    columns: [
      { column: 'RowID', type: 'int64', description: 'Transaction record row index' },
      { column: 'OrderID', type: 'object/string', description: 'Unique incremental order reference code' },
      { column: 'OrderDate', type: 'object/string', description: 'Date the order was placed' },
      { column: 'ShipDate', type: 'object/string', description: 'Date the order was shipped' },
      { column: 'ShipMode', type: 'object/string', description: 'Class of shipping (Standard, Second Class, First Class, Same Day)' },
      { column: 'Segment', type: 'object/string', description: 'Consumer group (Consumer, Corporate, Home Office)' },
      { column: 'Region', type: 'object/string', description: 'Geographical sales region (East, West, Central, South)' },
      { column: 'Category', type: 'object/string', description: 'Product department category (Furniture, Office Supplies, Technology)' },
      { column: 'Sub-Category', type: 'object/string', description: 'Detailed product segment division' },
      { column: 'Product Name', type: 'object/string', description: 'Full catalog name of the product' },
      { column: 'Sales', type: 'float64', description: 'Total transaction revenue sales value' },
      { column: 'Quantity', type: 'int64', description: 'Number of items ordered' },
      { column: 'Discount', type: 'float64', description: 'Discount percentage applied' },
      { column: 'Profit', type: 'float64', description: 'Net earnings profit of the transaction' }
    ],
    rows: [
      { RowID: 1, OrderID: 'CA-2016-152156', OrderDate: '2016-11-08', ShipDate: '2016-11-11', ShipMode: 'Second Class', Segment: 'Consumer', Region: 'South', Category: 'Furniture', 'Sub-Category': 'Bookcases', 'Product Name': 'Bush Somerset Collection Bookcase', Sales: 261.96, Quantity: 2, Discount: 0.0, Profit: 41.91 },
      { RowID: 2, OrderID: 'CA-2016-152156', OrderDate: '2016-11-08', ShipDate: '2016-11-11', ShipMode: 'Second Class', Segment: 'Consumer', Region: 'South', Category: 'Furniture', 'Sub-Category': 'Chairs', 'Product Name': 'Hon Deluxe Fabric Upholstered Stacking Chairs', Sales: 731.94, Quantity: 3, Discount: 0.0, Profit: 219.582 },
      { RowID: 3, OrderID: 'CA-2016-138688', OrderDate: '2016-06-12', ShipDate: '2016-06-16', ShipMode: 'Second Class', Segment: 'Corporate', Region: 'West', Category: 'Office Supplies', 'Sub-Category': 'Labels', 'Product Name': 'Self-Adhesive Address Labels', Sales: 14.62, Quantity: 2, Discount: 0.0, Profit: 6.871 },
      { RowID: 4, OrderID: 'US-2015-108966', OrderDate: '2015-10-11', ShipDate: '2015-10-18', ShipMode: 'Standard Class', Segment: 'Consumer', Region: 'South', Category: 'Furniture', 'Sub-Category': 'Tables', 'Product Name': 'Bretford CR4500 Series Utility Table', Sales: 957.57, Quantity: 5, Discount: 0.45, Profit: -383.03 }
    ]
  },
  'stock_market.csv': {
    name: 'stock_market.csv',
    description: 'Time series financial records of multiple indexes.',
    columns: [
      { column: 'Date', type: 'object/string', description: 'Trading transaction date (YYYY-MM-DD)' },
      { column: 'Symbol', type: 'object/string', description: 'Stock ticker identifier symbol (e.g. AAPL, MSFT)' },
      { column: 'Open', type: 'float64', description: 'Market opening stock price' },
      { column: 'High', type: 'float64', description: 'Maximum price reached during the day' },
      { column: 'Low', type: 'float64', description: 'Minimum price reached during the day' },
      { column: 'Close', type: 'float64', description: 'Market closing stock price' },
      { column: 'Volume', type: 'int64', description: 'Total shares traded during the session' }
    ],
    rows: [
      { Date: '2023-01-03', Symbol: 'AAPL', Open: 130.28, High: 130.90, Low: 124.17, Close: 125.07, Volume: 112117500 },
      { Date: '2023-01-04', Symbol: 'AAPL', Open: 126.89, High: 128.66, Low: 125.08, Close: 126.36, Volume: 89113600 },
      { Date: '2023-01-05', Symbol: 'AAPL', Open: 127.13, High: 127.77, Low: 124.76, Close: 125.02, Volume: 80962700 },
      { Date: '2023-01-06', Symbol: 'AAPL', Open: 126.01, High: 130.29, Low: 124.89, Close: 129.62, Volume: 87754700 }
    ]
  },
  'company_employees.csv': {
    name: 'company_employees.csv',
    description: 'Messy HR records of company employees with trailing spaces and duplicates.',
    columns: [
      { column: 'Employee_ID', type: 'object/string', description: 'Unique alphanumeric employee index' },
      { column: 'Full_Name', type: 'object/string', description: 'First and Last name' },
      { column: 'Department', type: 'object/string', description: 'Department assignment (contains messy spaces)' },
      { column: 'Salary', type: 'float64', description: 'Annual gross earnings salary' },
      { column: 'Join_Date', type: 'object/string', description: 'Employment starting date string' }
    ],
    rows: [
      { Employee_ID: 'EMP001', Full_Name: 'John Doe', Department: '  IT ', Salary: 85000.0, Join_Date: '2021-03-15' },
      { Employee_ID: 'EMP002', Full_Name: 'Jane Smith', Department: 'Marketing', Salary: 65000.0, Join_Date: '2020/07/19' },
      { Employee_ID: 'EMP003', Full_Name: 'Alice Johnson', Department: ' IT  ', Salary: 92000.0, Join_Date: '2022-01-10' },
      { Employee_ID: 'EMP001', Full_Name: 'John Doe', Department: '  IT ', Salary: 85000.0, Join_Date: '2021-03-15' }
    ]
  },
  'financial_transactions_part1.csv': {
    name: 'financial_transactions_part1.csv',
    description: 'First fragment of high-volume financial transactions ledger with network retry ID duplicates, whitespace issues, and missing fields.',
    columns: [
      { column: 'TransactionID', type: 'object/string', description: 'Unique transaction code (contains duplicates)' },
      { column: 'Date', type: 'object/string', description: 'Date and time of transaction' },
      { column: 'CustomerID', type: 'object/string', description: 'Unique identifier for the customer' },
      { column: 'MerchantType', type: 'object/string', description: 'Category of merchant (contains spacing anomalies)' },
      { column: 'TransactionAmount', type: 'float64', description: 'Amount transacted in USD (contains nulls)' }
    ],
    rows: [
      { TransactionID: 'T10001', Date: '2026-01-01 12:00:00', CustomerID: 'C1005', MerchantType: 'Retail', TransactionAmount: 120.50 },
      { TransactionID: 'T10002', Date: '2026-01-02 12:00:00', CustomerID: 'C1012', MerchantType: '  food ', TransactionAmount: 15.20 },
      { TransactionID: 'T10001', Date: '2026-01-01 12:00:00', CustomerID: 'C1005', MerchantType: 'Retail', TransactionAmount: 120.50 }
    ]
  },
  'financial_transactions_part2.csv': {
    name: 'financial_transactions_part2.csv',
    description: 'Second fragment of high-volume financial transactions ledger with network retry ID duplicates, whitespace issues, and missing fields.',
    columns: [
      { column: 'TransactionID', type: 'object/string', description: 'Unique transaction code (contains duplicates)' },
      { column: 'Date', type: 'object/string', description: 'Date and time of transaction' },
      { column: 'CustomerID', type: 'object/string', description: 'Unique identifier for the customer' },
      { column: 'MerchantType', type: 'object/string', description: 'Category of merchant (contains spacing anomalies)' },
      { column: 'TransactionAmount', type: 'float64', description: 'Amount transacted in USD (contains nulls)' }
    ],
    rows: [
      { TransactionID: 'T10501', Date: '2026-03-01 12:00:00', CustomerID: 'C1402', MerchantType: 'Travel', TransactionAmount: 450.00 },
      { TransactionID: 'T10502', Date: '2026-03-02 12:00:00', CustomerID: 'C1110', MerchantType: 'Entertainment', TransactionAmount: null }
    ]
  },
  'customer_churn_dirty.csv': {
    name: 'customer_churn_dirty.csv',
    description: 'Dirty customer loyalty and churn tracking ledger with trailing whitespace labels, non-standard missing cells (?), and multi-device login duplicates.',
    columns: [
      { column: 'CustomerID', type: 'object/string', description: 'Unique profile identifier (contains duplicates)' },
      { column: 'Age', type: 'object/string', description: 'Customer age in years (contains hidden nulls "?")' },
      { column: 'Tenure', type: 'float64', description: 'Months customer has remained with platform (contains missing values)' },
      { column: 'Segment', type: 'object/string', description: 'Socioeconomic customer tier (contains trailing whitespace)' },
      { column: 'Churn', type: 'int64', description: 'Churn status binary indicator (1 = Churned, 0 = Active)' }
    ],
    rows: [
      { CustomerID: 'C20001', Age: '34', Tenure: 12.0, Segment: 'Premium', Churn: 0 },
      { CustomerID: 'C20002', Age: '?', Tenure: null, Segment: 'Standard ', Churn: 1 },
      { CustomerID: 'C20001', Age: '34', Tenure: 12.0, Segment: 'Premium', Churn: 0 }
    ]
  },
  'iot_telemetry_corrupt.csv': {
    name: 'iot_telemetry_corrupt.csv',
    description: 'Industrial IoT telemetry data with overlapping timestamp anomalies, system reboot duplicates, and corrupted sensor logs.',
    columns: [
      { column: 'Timestamp', type: 'object/string', description: 'Date and time of sensor log (contains overlaps)' },
      { column: 'DeviceID', type: 'object/string', description: 'Unique sensor device name' },
      { column: 'Temperature', type: 'float64', description: 'Device temperature in Celsius (contains missing values)' },
      { column: 'Humidity', type: 'object/string', description: 'Device relative humidity percentage (contains corrupt string "Error" values)' }
    ],
    rows: [
      { Timestamp: '2026-08-20 10:00:00', DeviceID: 'D-01', Temperature: 24.5, Humidity: '55.2' },
      { Timestamp: '2026-08-20 10:00:00', DeviceID: 'D-01', Temperature: null, Humidity: 'Error' }
    ]
  },
  'healthcare_demographics_raw.csv': {
    name: 'healthcare_demographics_raw.csv',
    description: 'Messy demographic tracking data of hospitalized patients containing duplicate PatientHash signatures, and missing critical health indexes.',
    columns: [
      { column: 'PatientHash', type: 'object/string', description: 'Encrypted hash signature identifier (contains duplicates)' },
      { column: 'Age', type: 'float64', description: 'Patient age in years (contains missing values)' },
      { column: 'BloodPressure', type: 'float64', description: 'Systolic blood pressure index' },
      { column: 'StayDuration', type: 'float64', description: 'Days patient remained admitted' },
      { column: 'DiseaseCategory', type: 'object/string', description: 'Primary diagnosis category' },
      { column: 'SeverityGrade', type: 'object/string', description: 'Disease severity grade (Mild, Moderate, Severe, or missing)' }
    ],
    rows: [
      { PatientHash: 'HASH_1052', Age: 45.0, BloodPressure: 120.0, StayDuration: 5.0, DiseaseCategory: 'Cardiology', SeverityGrade: 'Moderate' },
      { PatientHash: 'HASH_1882', Age: null, BloodPressure: 145.0, StayDuration: null, DiseaseCategory: 'Oncology', SeverityGrade: null }
    ]
  },
  'logistics_tracking_dirty.csv': {
    name: 'logistics_tracking_dirty.csv',
    description: 'Supply chain shipment delay database with irregular date formats, tracking ID duplicates, and missing carriers or transit days.',
    columns: [
      { column: 'TrackingNumber', type: 'object/string', description: 'Unique package tracking ID (contains duplicates)' },
      { column: 'ShipDate', type: 'object/string', description: 'Date shipment was dispatched (inconsistent format)' },
      { column: 'TransitDays', type: 'float64', description: 'Days in transit (contains missing values)' },
      { column: 'ShippingTier', type: 'object/string', description: 'Class of shipping (Express, Standard, Economy)' },
      { column: 'CarrierName', type: 'object/string', description: 'Dispatched logistics carrier company' }
    ],
    rows: [
      { TrackingNumber: 'TRK510203', ShipDate: '2026-03-01', TransitDays: 3.0, ShippingTier: 'Express', CarrierName: 'FedEx' },
      { TrackingNumber: 'TRK590212', ShipDate: '2026-03-02', TransitDays: null, ShippingTier: 'Standard', CarrierName: null }
    ]
  },
  'branch_quarterly_revenue.csv': {
    name: 'branch_quarterly_revenue.csv',
    description: 'Quarterly branch revenue summary database tracking Q1-Q4 metrics for 50 global offices.',
    columns: [
      { column: 'BranchName', type: 'object/string', description: 'Identifier of global corporate branch' },
      { column: 'Q1', type: 'float64', description: 'Quarter 1 revenue' },
      { column: 'Q2', type: 'float64', description: 'Quarter 2 revenue' },
      { column: 'Q3', type: 'float64', description: 'Quarter 3 revenue' },
      { column: 'Q4', type: 'float64', description: 'Quarter 4 revenue' },
      { column: 'StdDev', type: 'float64', description: 'Standard deviation branch variance value' }
    ],
    rows: [
      { BranchName: 'Branch_1', Q1: 250000.0, Q2: 275000.0, Q3: 260000.0, Q4: 310000.0, StdDev: 12000.0 },
      { BranchName: 'Branch_2', Q1: 180000.0, Q2: 195000.0, Q3: 200000.0, Q4: 215000.0, StdDev: 8000.0 }
    ]
  },
  'budget_2026.xlsx': {
    name: 'budget_2026.xlsx',
    description: 'Regional corporate spreadsheet compiling multiple regional financial budget sheets (North, South, East) with differing headers and project ID duplicates.',
    columns: [
      { column: 'ProjID', type: 'object/string', description: 'Standardized Project Code' },
      { column: 'Dept', type: 'object/string', description: 'Standardized Corporate Department' },
      { column: 'Budget', type: 'float64', description: 'Budget Allocation Amount' }
    ],
    rows: [
      { ProjID: 'P100', Dept: 'IT', Budget: 150000.0 },
      { ProjID: 'P101', Dept: 'HR', Budget: 80000.0 }
    ]
  },
  'retail_inventory_merged.xlsx': {
    name: 'retail_inventory_merged.xlsx',
    description: 'Inventory levels Excel ledger featuring merged cells for category names, formatting errors, blank count records, and duplicate SKUs.',
    columns: [
      { column: 'Category', type: 'object/string', description: 'Unmerged Category Names' },
      { column: 'SKU', type: 'object/string', description: 'Unique Stock Keeping Unit' },
      { column: 'StockQuantity', type: 'float64', description: 'Inventory stock count levels' },
      { column: 'StockStatus', type: 'object/string', description: 'Current Stock Status Flag' }
    ],
    rows: [
      { Category: 'Electronics', SKU: 'SKU-001', StockQuantity: 45.0, StockStatus: 'In Stock' },
      { Category: 'Electronics', SKU: 'SKU-002', StockQuantity: null, StockStatus: 'In Stock' }
    ]
  },
  'employee_performance_irregular.xlsx': {
    name: 'employee_performance_irregular.xlsx',
    description: 'HR appraisals ledger structured with irregular metadata rows at the top, duplicate employee codes, and missing scoring slots.',
    columns: [
      { column: 'EmployeeID', type: 'object/string', description: 'Unique appraisal employee identifier' },
      { column: 'Dept', type: 'object/string', description: 'Department assignment' },
      { column: 'AppraisalScore', type: 'float64', description: ' Appraisal performance rating score' },
      { column: 'EmploymentType', type: 'object/string', description: 'Appointed status type' }
    ],
    rows: [
      { EmployeeID: 'E101', Dept: 'Sales', AppraisalScore: 4.2, EmploymentType: 'Full-Time' },
      { EmployeeID: 'E102', Dept: 'Engineering', AppraisalScore: null, EmploymentType: 'Full-Time' }
    ]
  },
  'property_appraisals_corrupt.xlsx': {
    name: 'property_appraisals_corrupt.xlsx',
    description: 'Real estate appraisals sheet with missing valuations, duplicate properties, and text string currency columns.',
    columns: [
      { column: 'PropertyID', type: 'object/string', description: 'Property identifier code' },
      { column: 'ZipCode', type: 'object/string', description: 'Gepgraphical postal zip code' },
      { column: 'Price', type: 'object/string', description: 'Corrupt appraisal price text (e.g. $1,200,000)' },
      { column: 'SquareFootage', type: 'int64', description: 'Calculated internal property area' }
    ],
    rows: [
      { PropertyID: 'PROP1', ZipCode: '10001', Price: '$1,200,000', SquareFootage: 1500 },
      { PropertyID: 'PROP3', ZipCode: '10001', Price: null, SquareFootage: 1400 }
    ]
  },
  'smart_meter_consumption.xlsx': {
    name: 'smart_meter_consumption.xlsx',
    description: 'Multi-index power load logs of smart utility meters containing missing hourly reading blocks and timestamp synchronization duplicates.',
    columns: [
      { column: 'MeterID', type: 'object/string', description: 'Power grid meter identifier code' },
      { column: 'Timestamp', type: 'object/string', description: 'Consumption hourly timestamp' },
      { column: 'PowerLoad_kW', type: 'float64', description: 'Recorded energy power draw in kW' }
    ],
    rows: [
      { MeterID: 'M_01', Timestamp: '2026-06-01 00:00:00', PowerLoad_kW: 2.4 },
      { MeterID: 'M_01', Timestamp: '2026-06-01 01:00:00', PowerLoad_kW: null }
    ]
  }
}

