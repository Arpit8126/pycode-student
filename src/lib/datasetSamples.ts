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
  }
}
