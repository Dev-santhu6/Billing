# Supermarket Billing System

A comprehensive single-page responsive billing system built with plain HTML, CSS, and JavaScript. Features product management, POS billing, barcode scanning, and financial tracking.

## Features

### Product Management (CRUD)
- Create, Read, Update, and Delete products
- Product fields: ID (auto), Barcode, Name, Category, Cost Price, Sell Price, Quantity on Hand, Unit, Tax %, Description, Image URL
- Form validation for required fields and numeric checks
- Product list with sorting and search functionality (by name, barcode, category)
- CSV export/import for backup and data migration

### Billing / POS
- Add products to cart via search or barcode scanning
- Display product details: name, barcode, quantity, unit price, line total, tax, and total
- Increment/decrement quantity and remove items
- Calculate subtotal, total tax, discounts (item-level or bill-level), and grand total
- Generate printable invoice with professional layout
- Automatically decrement product quantity on hand when bill is completed
- Record sales as income transactions

### Barcode Scanning
- Camera-based barcode scanning using ZXing library
- Manual barcode entry fallback if camera access is denied
- Visual guidance with onscreen rectangle
- Auto-add products to cart when scanned
- Option to create new product if barcode not found

### Income & Expense Tracking
- Automatic income recording from completed bills
- Manual expense entry with date, amount, category, and notes
- Dashboard with:
  - Total income, total expenses, and net profit
  - Date range selection (Today, This Week, This Month, Custom)
  - Recent transactions list
  - Interactive charts showing income vs expenses over time

### Additional Features
- Fully responsive design (mobile-first approach)
- Modern, clean UI with gradient accents
- Keyboard navigation support
- Accessible form labels and ARIA attributes
- Data persistence using IndexedDB (with localStorage fallback)

## Setup Instructions

### Local Development

1. **Clone or download the project files**
   ```bash
   # Ensure you have these files:
   # - index.html
   # - styles.css
   # - app.js
   # - db.js
   # - scanner.js
   ```

2. **Create an asset folder** (optional but recommended)
   ```bash
   mkdir asset
   # The app will create JSON files here automatically
   ```

3. **Serve the files using a local web server**

   The application requires a web server due to browser security restrictions (especially for camera access and file operations).

   **Option 1: Using Python (if installed)**
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Python 2
   python -m SimpleHTTPServer 8000
   ```

   **Option 2: Using Node.js (if installed)**
   ```bash
   # Install http-server globally
   npm install -g http-server
   
   # Run server
   http-server -p 8000
   ```

   **Option 3: Using PHP (if installed)**
   ```bash
   php -S localhost:8000
   ```

   **Option 4: Using VS Code Live Server Extension**
   - Install the "Live Server" extension in VS Code
   - Right-click on `index.html` and select "Open with Live Server"

3. **Access the application**
   - Open your browser and navigate to `http://localhost:8000`
   - The application will automatically initialize the database

### Production Deployment

Simply upload all files to your web server. The application works entirely client-side and requires no backend server.

## Data Storage Configuration

### File-Based Storage (Asset Folder)
The application stores all data in JSON files within a local "asset" folder:
- `products.json` - All product data
- `transactions.json` - All sales transactions
- `expenses.json` - All expense records

### Two Methods to Use Asset Folder:

#### Method 1: File System Access API (Recommended - Chrome/Edge)
1. Click "Select Asset Folder" button in the header
2. Choose or create an "asset" folder on your computer
3. The app will automatically save/load data from this folder
4. **Note:** You need to select the folder each time you open the app (browser security)

#### Method 2: Manual File Operations (All Browsers)
1. Create an "asset" folder in your project directory
2. Place your JSON files (`products.json`, `transactions.json`, `expenses.json`) in this folder
3. Click "Load Data Files" to manually load files
4. Click "Save All Data" to download files (save them to your asset folder)

### Automatic Loading
On app startup, the system tries to load data from:
1. Selected asset folder (if using File System Access API)
2. `asset/` folder via HTTP (if files are served by web server)

If no data is found, the app starts with empty data.

## Usage Guide

### Adding Products
1. Navigate to the "Products" section
2. Click "Add New Product"
3. Fill in the required fields:
   - Barcode (unique identifier)
   - Name
   - Category
   - Cost Price and Sell Price
   - Quantity on Hand
   - Unit (e.g., pcs, kg, L)
   - Tax Percentage
4. Optionally add description and image URL
5. Click "Save Product"

### Creating a Bill
1. Navigate to the "Billing" section
2. Add products to cart by:
   - **Search:** Type product name or barcode in the search box
   - **Scan:** Click "Scan Barcode" and point camera at barcode
   - **Manual Entry:** Enter barcode manually and click "Add by Barcode"
3. Adjust quantities as needed
4. Apply bill-level discount if required
5. Click "Complete Bill" to finalize
6. Use "Print Invoice" to generate a printable invoice

### Tracking Expenses
1. Navigate to the "Dashboard" section
2. Fill in the expense form:
   - Date
   - Amount
   - Category
   - Note (optional)
3. Click "Add Expense"

### Viewing Financial Reports
1. Navigate to the "Dashboard" section
2. Select a date range (Today, This Week, This Month, or Custom)
3. View:
   - Total income, expenses, and net profit
   - Income vs expenses chart
   - Recent transactions list

### Exporting/Importing Products
- **Export:** Click "Export CSV" in the Products section to download all products as CSV
- **Import:** Click "Import CSV" and select a CSV file with the following format:
  ```
  ID,Barcode,Name,Category,Cost Price,Sell Price,Quantity,Unit,Tax %,Description,Image URL
  ```

## Browser Compatibility

- **Chrome/Edge:** Full support (recommended)
- **Firefox:** Full support
- **Safari:** Full support (iOS 11+)
- **Opera:** Full support

**Note:** Barcode scanning requires camera access and works best on mobile devices or devices with webcam.

## File Structure

```
billing/
├── index.html          # Main HTML structure
├── styles.css          # All styling
├── app.js              # Main application logic
├── db.js               # Database operations (IndexedDB/localStorage)
├── scanner.js          # Barcode scanning functionality
└── README.md           # This file
```

## Technical Details

### Libraries Used
- **ZXing Library** (via CDN): For barcode scanning
- **Chart.js** (via CDN): For financial charts

### Data Storage
- **Products:** Stored in `products` object store
- **Transactions:** Stored in `transactions` object store
- **Expenses:** Stored in `expenses` object store

### Security Notes
- All data is stored locally in the browser
- No data is sent to external servers
- HTML escaping is implemented to prevent XSS attacks
- Input validation is performed on all forms

## Troubleshooting

### Camera not working on Mobile
- **HTTPS Required**: Mobile browsers require HTTPS (or localhost) for camera access
  - Use `https://` URL when accessing from mobile
  - Or use `localhost` when testing locally
- **Permissions**: Grant camera permissions when prompted
- **Browser Support**: 
  - Chrome/Edge (Android/iOS): Full support
  - Safari (iOS): Full support (iOS 11+)
  - Firefox Mobile: May have limited support
- **If camera doesn't start**:
  1. Check browser settings → Site permissions → Camera
  2. Ensure the site is using HTTPS
  3. Try refreshing the page
  4. Use manual barcode entry as fallback

### Data not persisting
- Check browser storage settings (ensure cookies/local storage is enabled)
- Try clearing browser cache and reloading
- Check browser console for errors

### Barcode scanning not working
- Ensure ZXing library is loaded (check browser console)
- Try manual barcode entry as fallback
- Ensure good lighting and camera focus

## Future Enhancements (Optional)

- User authentication and role-based access
- Multi-store support
- Advanced reporting and analytics
- Receipt email functionality
- Inventory alerts for low stock
- Product image upload (instead of URL)
- Payment method tracking
- Customer management

## License

This project is open source and available for use and modification.

## Support

For issues or questions, please check the browser console for error messages and ensure all files are properly loaded.

