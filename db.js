/**
 * Database Module - File-based storage in local "asset" folder
 * Uses File System Access API with fallback to manual file operations
 */

const STORES = {
    PRODUCTS: 'products',
    TRANSACTIONS: 'transactions',
    EXPENSES: 'expenses'
};

const FILE_NAMES = {
    PRODUCTS: 'products.json',
    TRANSACTIONS: 'transactions.json',
    EXPENSES: 'expenses.json'
};

/**
 * Get file name for store
 */
function getFileName(storeName) {
    const mapping = {
        'products': FILE_NAMES.PRODUCTS,
        'transactions': FILE_NAMES.TRANSACTIONS,
        'expenses': FILE_NAMES.EXPENSES
    };
    return mapping[storeName] || `${storeName}.json`;
}

let assetFolderHandle = null;
let useFileSystemAPI = false;
let dataCache = {
    products: [],
    transactions: [],
    expenses: []
};

/**
 * Initialize the database - Load data from asset folder
 */
async function initDB() {
    // Check if File System Access API is available
    if ('showDirectoryPicker' in window) {
        useFileSystemAPI = true;
        console.log('File System Access API available');
    } else {
        console.log('File System Access API not available, using manual file operations');
    }
    
    // First, try to load from localStorage (for persistence across refreshes)
    loadFromLocalStorage();
    
    // Then try to load from asset folder (will update if files exist)
    await loadAllData();
    
    // If no products exist, add default products
    if (dataCache.products.length === 0) {
        await addDefaultProducts();
    }
}

/**
 * Select asset folder (File System Access API)
 */
async function selectAssetFolder() {
    if (!useFileSystemAPI) {
        alert('File System Access API not supported in this browser. Please use manual save/load buttons.');
        return false;
    }

    try {
        assetFolderHandle = await window.showDirectoryPicker();
        console.log('Asset folder selected');
        
        // Save folder handle to sessionStorage for persistence
        // Note: We can't store the handle directly, so we'll need to re-select each session
        
        // Load data from the selected folder
        await loadAllData();
        return true;
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error selecting folder:', error);
            alert('Failed to select folder: ' + error.message);
        }
        return false;
    }
}

/**
 * Load data from file
 */
async function loadFromFile(fileName) {
    try {
        if (useFileSystemAPI && assetFolderHandle) {
            // Try to get file from selected folder
            try {
                const fileHandle = await assetFolderHandle.getFileHandle(fileName, { create: false });
                const file = await fileHandle.getFile();
                const text = await file.text();
                return text ? JSON.parse(text) : [];
            } catch (error) {
                // File doesn't exist, return empty array
                return [];
            }
        } else {
            // Try to load from asset folder via fetch (if served locally)
            try {
                const response = await fetch(`asset/${fileName}`);
                if (response.ok) {
                    const text = await response.text();
                    return text ? JSON.parse(text) : [];
                }
            } catch (error) {
                // File doesn't exist or not accessible
                console.log(`File ${fileName} not found, starting with empty data`);
            }
            return [];
        }
    } catch (error) {
        console.error(`Error loading ${fileName}:`, error);
        return [];
    }
}

/**
 * Save data to file
 */
async function saveToFile(fileName, data) {
    try {
        if (useFileSystemAPI && assetFolderHandle) {
            // Save to selected folder
            const fileHandle = await assetFolderHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
            console.log(`Saved ${fileName} to asset folder`);
            return true;
        } else {
            // Fallback: Download file
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
            alert(`Please save ${fileName} to your asset folder manually.`);
            return false;
        }
    } catch (error) {
        console.error(`Error saving ${fileName}:`, error);
        alert(`Failed to save ${fileName}: ${error.message}`);
        return false;
    }
}

/**
 * Load data from localStorage (for persistence across refreshes)
 */
function loadFromLocalStorage() {
    try {
        const productsData = localStorage.getItem('billing_products');
        const transactionsData = localStorage.getItem('billing_transactions');
        const expensesData = localStorage.getItem('billing_expenses');
        
        if (productsData) {
            dataCache.products = JSON.parse(productsData);
        }
        if (transactionsData) {
            dataCache.transactions = JSON.parse(transactionsData);
        }
        if (expensesData) {
            dataCache.expenses = JSON.parse(expensesData);
        }
        
        console.log('Data loaded from localStorage:', {
            products: dataCache.products.length,
            transactions: dataCache.transactions.length,
            expenses: dataCache.expenses.length
        });
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
}

/**
 * Save data to localStorage (for persistence across refreshes)
 */
function saveToLocalStorage() {
    try {
        localStorage.setItem('billing_products', JSON.stringify(dataCache.products));
        localStorage.setItem('billing_transactions', JSON.stringify(dataCache.transactions));
        localStorage.setItem('billing_expenses', JSON.stringify(dataCache.expenses));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

/**
 * Load all data from asset folder
 */
async function loadAllData() {
    const fileProducts = await loadFromFile(FILE_NAMES.PRODUCTS);
    const fileTransactions = await loadFromFile(FILE_NAMES.TRANSACTIONS);
    const fileExpenses = await loadFromFile(FILE_NAMES.EXPENSES);
    
    // If files exist, use file data (newer), otherwise keep localStorage data
    if (fileProducts.length > 0) {
        dataCache.products = fileProducts;
    }
    if (fileTransactions.length > 0) {
        dataCache.transactions = fileTransactions;
    }
    if (fileExpenses.length > 0) {
        dataCache.expenses = fileExpenses;
    }
    
    // Auto-increment IDs if needed
    if (dataCache.products.length > 0) {
        const maxId = Math.max(...dataCache.products.map(p => p.id || 0));
        if (maxId === 0) {
            dataCache.products.forEach((p, index) => {
                if (!p.id) p.id = index + 1;
            });
        }
    }
    if (dataCache.transactions.length > 0) {
        const maxId = Math.max(...dataCache.transactions.map(t => t.id || 0));
        if (maxId === 0) {
            dataCache.transactions.forEach((t, index) => {
                if (!t.id) t.id = index + 1;
            });
        }
    }
    if (dataCache.expenses.length > 0) {
        const maxId = Math.max(...dataCache.expenses.map(e => e.id || 0));
        if (maxId === 0) {
            dataCache.expenses.forEach((e, index) => {
                if (!e.id) e.id = index + 1;
            });
        }
    }
    
    // Save to localStorage for persistence
    saveToLocalStorage();
    
    console.log('Data loaded:', {
        products: dataCache.products.length,
        transactions: dataCache.transactions.length,
        expenses: dataCache.expenses.length
    });
}

/**
 * Save all data to asset folder
 */
async function saveAllData() {
    // Save to localStorage first (for immediate persistence)
    saveToLocalStorage();
    
    // Then save to files
    await saveToFile(FILE_NAMES.PRODUCTS, dataCache.products);
    await saveToFile(FILE_NAMES.TRANSACTIONS, dataCache.transactions);
    await saveToFile(FILE_NAMES.EXPENSES, dataCache.expenses);
}

/**
 * Add default products (Sugar and Dal)
 */
async function addDefaultProducts() {
    const defaultProducts = [
        {
            id: 1,
            barcode: '1001',
            name: 'Sugar',
            category: 'Grocery',
            costPrice: 45.00,
            sellPrice: 50.00,
            quantityOnHand: 100,
            unit: 'kg',
            taxPercent: 5,
            description: 'White granulated sugar',
            imageURL: null
        },
        {
            id: 2,
            barcode: '1002',
            name: 'Dal',
            category: 'Grocery',
            costPrice: 80.00,
            sellPrice: 90.00,
            quantityOnHand: 50,
            unit: 'kg',
            taxPercent: 5,
            description: 'Yellow split dal',
            imageURL: null
        }
    ];
    
    dataCache.products = defaultProducts;
    saveToLocalStorage();
    
    // Try to save to file if folder is selected
    try {
        await saveToFile(FILE_NAMES.PRODUCTS, defaultProducts);
    } catch (error) {
        console.log('Could not save default products to file, saved to localStorage only');
    }
    
    console.log('Default products added:', defaultProducts.length);
}

/**
 * Update cache directly (for manual file loading)
 */
function updateCache(storeName, data) {
    if (storeName === 'products') {
        dataCache.products = data;
    } else if (storeName === 'transactions') {
        dataCache.transactions = data;
    } else if (storeName === 'expenses') {
        dataCache.expenses = data;
    }
    
    // Save to localStorage for persistence
    saveToLocalStorage();
}

/**
 * Generic get all items from a store
 */
async function getAll(storeName) {
    // Return from cache
    return [...dataCache[storeName]];
}

/**
 * Generic get item by key
 */
async function getById(storeName, id) {
    const items = await getAll(storeName);
    return items.find(item => item.id === id);
}

/**
 * Generic add item to store
 */
async function add(storeName, item) {
    const items = dataCache[storeName];
    item.id = items.length > 0 ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
    items.push(item);
    
    // Save to localStorage immediately (for persistence)
    saveToLocalStorage();
    
    // Try to save to file
    try {
        await saveToFile(getFileName(storeName), items);
    } catch (error) {
        console.log('Could not save to file, saved to localStorage only');
    }
    
    return item.id;
}

/**
 * Generic update item in store
 */
async function update(storeName, item) {
    const items = dataCache[storeName];
    const index = items.findIndex(i => i.id === item.id);
    if (index !== -1) {
        items[index] = item;
        
        // Save to localStorage immediately (for persistence)
        saveToLocalStorage();
        
        // Try to save to file
        try {
            await saveToFile(getFileName(storeName), items);
        } catch (error) {
            console.log('Could not save to file, saved to localStorage only');
        }
        
        return item.id;
    }
    throw new Error('Item not found');
}

/**
 * Generic delete item from store
 */
async function remove(storeName, id) {
    const items = dataCache[storeName];
    const filtered = items.filter(i => i.id !== id);
    dataCache[storeName] = filtered;
    
    // Save to localStorage immediately (for persistence)
    saveToLocalStorage();
    
    // Try to save to file
    try {
        await saveToFile(getFileName(storeName), filtered);
    } catch (error) {
        console.log('Could not save to file, saved to localStorage only');
    }
}

/**
 * Search products by barcode
 */
async function getProductByBarcode(barcode) {
    const products = await getAll(STORES.PRODUCTS);
    return products.find(p => p.barcode === barcode) || null;
}

/**
 * Get transactions within date range
 */
async function getTransactionsByDateRange(startDate, endDate) {
    const transactions = await getAll(STORES.TRANSACTIONS);
    return transactions.filter(t => {
        const date = new Date(t.date);
        return date >= startDate && date <= endDate;
    });
}

/**
 * Get expenses within date range
 */
async function getExpensesByDateRange(startDate, endDate) {
    const expenses = await getAll(STORES.EXPENSES);
    return expenses.filter(e => {
        const date = new Date(e.date);
        return date >= startDate && date <= endDate;
    });
}

// Product-specific functions
const productsDB = {
    getAll: () => getAll(STORES.PRODUCTS),
    getById: (id) => getById(STORES.PRODUCTS, id),
    getByBarcode: (barcode) => getProductByBarcode(barcode),
    add: (product) => add(STORES.PRODUCTS, product),
    update: (product) => update(STORES.PRODUCTS, product),
    delete: (id) => remove(STORES.PRODUCTS, id)
};

// Transaction-specific functions
const transactionsDB = {
    getAll: () => getAll(STORES.TRANSACTIONS),
    getById: (id) => getById(STORES.TRANSACTIONS, id),
    add: (transaction) => add(STORES.TRANSACTIONS, transaction),
    getByDateRange: (startDate, endDate) => getTransactionsByDateRange(startDate, endDate)
};

// Expense-specific functions
const expensesDB = {
    getAll: () => getAll(STORES.EXPENSES),
    getById: (id) => getById(STORES.EXPENSES, id),
    add: (expense) => add(STORES.EXPENSES, expense),
    update: (expense) => update(STORES.EXPENSES, expense),
    delete: (id) => remove(STORES.EXPENSES, id),
    getByDateRange: (startDate, endDate) => getExpensesByDateRange(startDate, endDate)
};

// Make functions globally available
window.initDB = initDB;
window.selectAssetFolder = selectAssetFolder;
window.saveAllData = saveAllData;
window.loadAllData = loadAllData;
window.updateCache = updateCache;
window.productsDB = productsDB;
window.transactionsDB = transactionsDB;
window.expensesDB = expensesDB;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { initDB, productsDB, transactionsDB, expensesDB };
}

