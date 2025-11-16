/**
 * Main Application Logic
 * Supermarket Billing System
 */

// Global state
let cart = [];
let currentDateRange = 'today';
let chartInstance = null;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await initDB();
    initScanner(); // Initialize barcode scanner
    setupEventListeners();
    loadProducts();
    updateDashboard();
});

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const section = e.target.dataset.section;
            switchSection(section);
        });
    });

    // Product Management
    document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    document.getElementById('cancelProductBtn').addEventListener('click', closeProductModal);
    document.getElementById('exportProductsBtn').addEventListener('click', exportProductsCSV);
    document.getElementById('importProductsBtn').addEventListener('click', () => {
        document.getElementById('importFileInput').click();
    });
    document.getElementById('importFileInput').addEventListener('change', handleImportCSV);
    document.getElementById('productFilter').addEventListener('input', filterProducts);
    document.getElementById('categoryFilter').addEventListener('change', filterProducts);
    document.getElementById('sortBy').addEventListener('change', filterProducts);

    // Billing
    document.getElementById('scanBarcodeBtn').addEventListener('click', openScannerModal);
    document.getElementById('stopScannerBtn').addEventListener('click', closeScannerModal);
    document.getElementById('addByBarcodeBtn').addEventListener('click', addProductByBarcode);
    document.getElementById('manualBarcode').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addProductByBarcode();
        }
    });
    document.getElementById('productSearch').addEventListener('input', searchProducts);
    document.getElementById('billDiscount').addEventListener('input', updateCartSummary);
    document.getElementById('clearCartBtn').addEventListener('click', clearCart);
    document.getElementById('completeBillBtn').addEventListener('click', completeBill);
    document.getElementById('printInvoiceBtn').addEventListener('click', printInvoice);

    // Dashboard
    document.querySelectorAll('.date-range-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const range = e.target.dataset.range;
            setDateRange(range);
        });
    });
    document.getElementById('applyCustomRange').addEventListener('click', () => {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate && endDate) {
            updateDashboard(new Date(startDate), new Date(endDate));
        }
    });
    document.getElementById('expenseForm').addEventListener('submit', handleExpenseSubmit);

    // Data Management
    document.getElementById('selectAssetFolderBtn').addEventListener('click', async () => {
        const success = await selectAssetFolder();
        if (success) {
            alert('Asset folder selected! Data will be saved to this folder.');
            loadProducts();
            updateDashboard();
        }
    });
    document.getElementById('saveDataBtn').addEventListener('click', async () => {
        await saveAllData();
        alert('All data saved to asset folder!');
    });
    document.getElementById('loadDataBtn').addEventListener('click', () => {
        // Show file inputs for manual loading
        if (confirm('Load data files manually? You will need to select products.json, transactions.json, and expenses.json files.')) {
            document.getElementById('loadProductsFile').click();
        }
    });
    document.getElementById('loadProductsFile').addEventListener('change', handleLoadDataFile);
    document.getElementById('loadTransactionsFile').addEventListener('change', handleLoadDataFile);
    document.getElementById('loadExpensesFile').addEventListener('change', handleLoadDataFile);

    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
                if (modal.id === 'scannerModal') {
                    stopScanning();
                }
            }
        });
    });

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            if (e.target.id === 'scannerModal') {
                stopScanning();
            }
        }
    });
}

/**
 * Switch between sections
 */
function switchSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    document.getElementById(sectionName).classList.add('active');

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === sectionName) {
            btn.classList.add('active');
        }
    });

    // Load data for section
    if (sectionName === 'products') {
        loadProducts();
    } else if (sectionName === 'dashboard') {
        updateDashboard();
    }
}

// ==================== PRODUCT MANAGEMENT ====================

/**
 * Load and display all products
 */
async function loadProducts() {
    try {
        const products = await productsDB.getAll();
        displayProducts(products);
        updateCategoryFilter(products);
    } catch (error) {
        console.error('Error loading products:', error);
        alert('Failed to load products');
    }
}

/**
 * Display products in the list
 */
function displayProducts(products) {
    const container = document.getElementById('productsList');
    
    if (products.length === 0) {
        container.innerHTML = '<p class="empty-message">No products found. Add your first product!</p>';
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="product-card">
            <div class="product-header">
                <div class="product-name">${escapeHtml(product.name)}</div>
                <div class="product-actions">
                    <button class="btn btn-small btn-primary" onclick="editProduct(${product.id})">Edit</button>
                    <button class="btn btn-small btn-danger" onclick="deleteProduct(${product.id})">Delete</button>
                </div>
            </div>
            <div class="product-details">
                <div class="product-detail"><strong>Barcode:</strong> ${escapeHtml(product.barcode)}</div>
                <div class="product-detail"><strong>Category:</strong> ${escapeHtml(product.category)}</div>
                <div class="product-detail"><strong>Cost Price:</strong> ₹${product.costPrice.toFixed(2)}</div>
                <div class="product-detail"><strong>Sell Price:</strong> ₹${product.sellPrice.toFixed(2)}</div>
                <div class="product-detail"><strong>Quantity:</strong> ${product.quantityOnHand} ${escapeHtml(product.unit)}</div>
                <div class="product-detail"><strong>Tax:</strong> ${product.taxPercent}%</div>
            </div>
            ${product.description ? `<div class="product-detail" style="margin-top: 10px;"><strong>Description:</strong> ${escapeHtml(product.description)}</div>` : ''}
        </div>
    `).join('');
}

/**
 * Update category filter dropdown
 */
function updateCategoryFilter(products) {
    const categories = [...new Set(products.map(p => p.category))].sort();
    const filter = document.getElementById('categoryFilter');
    const currentValue = filter.value;
    
    filter.innerHTML = '<option value="">All Categories</option>' + 
        categories.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('');
    
    if (currentValue && categories.includes(currentValue)) {
        filter.value = currentValue;
    }
}

/**
 * Filter and sort products
 */
async function filterProducts() {
    try {
        let products = await productsDB.getAll();
        const searchTerm = document.getElementById('productFilter').value.toLowerCase();
        const category = document.getElementById('categoryFilter').value;
        const sortBy = document.getElementById('sortBy').value;

        // Filter
        products = products.filter(p => {
            const matchesSearch = !searchTerm || 
                p.name.toLowerCase().includes(searchTerm) ||
                p.barcode.toLowerCase().includes(searchTerm) ||
                p.category.toLowerCase().includes(searchTerm);
            const matchesCategory = !category || p.category === category;
            return matchesSearch && matchesCategory;
        });

        // Sort
        products.sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'barcode') return a.barcode.localeCompare(b.barcode);
            if (sortBy === 'category') return a.category.localeCompare(b.category);
            if (sortBy === 'quantityOnHand') return b.quantityOnHand - a.quantityOnHand;
            return 0;
        });

        displayProducts(products);
    } catch (error) {
        console.error('Error filtering products:', error);
    }
}

/**
 * Open product modal for adding/editing
 */
async function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const title = document.getElementById('modalTitle');

    form.reset();
    document.getElementById('productId').value = '';

    if (productId) {
        title.textContent = 'Edit Product';
        try {
            const product = await productsDB.getById(productId);
            if (product) {
                document.getElementById('productId').value = product.id;
                document.getElementById('barcode').value = product.barcode;
                document.getElementById('productName').value = product.name;
                document.getElementById('category').value = product.category;
                document.getElementById('costPrice').value = product.costPrice;
                document.getElementById('sellPrice').value = product.sellPrice;
                document.getElementById('quantityOnHand').value = product.quantityOnHand;
                document.getElementById('unit').value = product.unit;
                document.getElementById('taxPercent').value = product.taxPercent;
                document.getElementById('description').value = product.description || '';
                document.getElementById('imageURL').value = product.imageURL || '';
            }
        } catch (error) {
            console.error('Error loading product:', error);
            alert('Failed to load product');
        }
    } else {
        title.textContent = 'Add Product';
    }

    modal.style.display = 'block';
}

/**
 * Close product modal
 */
function closeProductModal() {
    document.getElementById('productModal').style.display = 'none';
}

/**
 * Handle product form submission
 */
async function handleProductSubmit(e) {
    e.preventDefault();

    const product = {
        id: document.getElementById('productId').value ? parseInt(document.getElementById('productId').value) : undefined,
        barcode: document.getElementById('barcode').value.trim(),
        name: document.getElementById('productName').value.trim(),
        category: document.getElementById('category').value.trim(),
        costPrice: parseFloat(document.getElementById('costPrice').value),
        sellPrice: parseFloat(document.getElementById('sellPrice').value),
        quantityOnHand: parseFloat(document.getElementById('quantityOnHand').value),
        unit: document.getElementById('unit').value.trim(),
        taxPercent: parseFloat(document.getElementById('taxPercent').value),
        description: document.getElementById('description').value.trim(),
        imageURL: document.getElementById('imageURL').value.trim() || null
    };

    // Validation
    if (!product.barcode || !product.name || !product.category) {
        alert('Please fill in all required fields');
        return;
    }

    if (product.costPrice < 0 || product.sellPrice < 0 || product.quantityOnHand < 0) {
        alert('Prices and quantity cannot be negative');
        return;
    }

    try {
        if (product.id) {
            await productsDB.update(product);
        } else {
            await productsDB.add(product);
        }
        closeProductModal();
        loadProducts();
        alert('Product saved successfully!');
    } catch (error) {
        console.error('Error saving product:', error);
        alert('Failed to save product');
    }
}

/**
 * Edit product
 */
async function editProduct(id) {
    await openProductModal(id);
}

/**
 * Delete product
 */
async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    try {
        await productsDB.delete(id);
        loadProducts();
        alert('Product deleted successfully');
    } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product');
    }
}

/**
 * Export products to CSV
 */
async function exportProductsCSV() {
    try {
        const products = await productsDB.getAll();
        const headers = ['ID', 'Barcode', 'Name', 'Category', 'Cost Price', 'Sell Price', 'Quantity', 'Unit', 'Tax %', 'Description', 'Image URL'];
        const rows = products.map(p => [
            p.id,
            p.barcode,
            p.name,
            p.category,
            p.costPrice,
            p.sellPrice,
            p.quantityOnHand,
            p.unit,
            p.taxPercent,
            p.description || '',
            p.imageURL || ''
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `products_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting products:', error);
        alert('Failed to export products');
    }
}

/**
 * Handle CSV import
 */
async function handleImportCSV(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const text = event.target.result;
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
                
                const product = {
                    barcode: values[1] || '',
                    name: values[2] || '',
                    category: values[3] || '',
                    costPrice: parseFloat(values[4]) || 0,
                    sellPrice: parseFloat(values[5]) || 0,
                    quantityOnHand: parseFloat(values[6]) || 0,
                    unit: values[7] || 'pcs',
                    taxPercent: parseFloat(values[8]) || 0,
                    description: values[9] || '',
                    imageURL: values[10] || null
                };

                if (product.barcode && product.name) {
                    await productsDB.add(product);
                }
            }

            alert('Products imported successfully!');
            loadProducts();
        } catch (error) {
            console.error('Error importing CSV:', error);
            alert('Failed to import products. Please check the CSV format.');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
}

// ==================== BILLING / POS ====================

/**
 * Search products for billing
 */
async function searchProducts() {
    const searchTerm = document.getElementById('productSearch').value.toLowerCase().trim();
    const resultsContainer = document.getElementById('searchResults');

    if (!searchTerm) {
        resultsContainer.classList.remove('active');
        return;
    }

    try {
        const products = await productsDB.getAll();
        const filtered = products.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            p.barcode.toLowerCase().includes(searchTerm)
        ).slice(0, 10); // Limit to 10 results

        if (filtered.length === 0) {
            resultsContainer.innerHTML = '<div class="search-result-item">No products found</div>';
            resultsContainer.classList.add('active');
            return;
        }

        resultsContainer.innerHTML = filtered.map(product => `
            <div class="search-result-item" onclick="addToCart(${product.id})">
                <strong>${escapeHtml(product.name)}</strong> - ${escapeHtml(product.barcode)} - 
                ₹${product.sellPrice.toFixed(2)} (${product.quantityOnHand} ${escapeHtml(product.unit)} available)
            </div>
        `).join('');

        resultsContainer.classList.add('active');
    } catch (error) {
        console.error('Error searching products:', error);
    }
}

/**
 * Add product to cart
 */
async function addToCart(productId, quantity = 1) {
    try {
        const product = await productsDB.getById(productId);
        if (!product) {
            alert('Product not found');
            return;
        }

        if (product.quantityOnHand < quantity) {
            alert(`Only ${product.quantityOnHand} ${product.unit} available`);
            return;
        }

        const existingItem = cart.find(item => item.productId === productId);
        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            if (newQuantity > product.quantityOnHand) {
                alert(`Only ${product.quantityOnHand} ${product.unit} available`);
                return;
            }
            existingItem.quantity = newQuantity;
        } else {
            cart.push({
                productId: product.id,
                name: product.name,
                barcode: product.barcode,
                quantity: quantity,
                unitPrice: product.sellPrice,
                taxPercent: product.taxPercent,
                unit: product.unit
            });
        }

        document.getElementById('productSearch').value = '';
        document.getElementById('searchResults').classList.remove('active');
        updateCartDisplay();
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Failed to add product to cart');
    }
}

/**
 * Update cart display
 */
function updateCartDisplay() {
    const container = document.getElementById('cartItems');

    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-message">Cart is empty. Add products to get started.</p>';
        updateCartSummary();
        return;
    }

    container.innerHTML = `
        <div class="cart-item cart-item-header">
            <div>Product</div>
            <div>Barcode</div>
            <div>Qty</div>
            <div>Unit Price</div>
            <div>Tax</div>
            <div>Line Total</div>
            <div>Actions</div>
        </div>
        ${cart.map((item, index) => {
            const lineTotal = item.quantity * item.unitPrice;
            const taxAmount = (lineTotal * item.taxPercent) / 100;
            const totalWithTax = lineTotal + taxAmount;

            return `
                <div class="cart-item">
                    <div>${escapeHtml(item.name)}</div>
                    <div>${escapeHtml(item.barcode)}</div>
                    <div>
                        <input type="number" value="${item.quantity}" min="1" 
                               onchange="updateCartQuantity(${index}, this.value)" 
                               class="input-small">
                        <span>${escapeHtml(item.unit)}</span>
                    </div>
                    <div>₹${item.unitPrice.toFixed(2)}</div>
                    <div>₹${taxAmount.toFixed(2)}</div>
                    <div>₹${totalWithTax.toFixed(2)}</div>
                    <div>
                        <button class="btn btn-small btn-danger" onclick="removeFromCart(${index})">Remove</button>
                    </div>
                </div>
            `;
        }).join('')}
    `;

    updateCartSummary();
}

/**
 * Update cart quantity
 */
function updateCartQuantity(index, newQuantity) {
    const quantity = parseFloat(newQuantity);
    if (quantity < 1) {
        alert('Quantity must be at least 1');
        updateCartDisplay();
        return;
    }

    cart[index].quantity = quantity;
    updateCartDisplay();
}

/**
 * Remove item from cart
 */
function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

/**
 * Update cart summary
 */
function updateCartSummary() {
    let subtotal = 0;
    let totalTax = 0;

    cart.forEach(item => {
        const lineTotal = item.quantity * item.unitPrice;
        subtotal += lineTotal;
        totalTax += (lineTotal * item.taxPercent) / 100;
    });

    const discountPercent = parseFloat(document.getElementById('billDiscount').value) || 0;
    const discountAmount = (subtotal + totalTax) * (discountPercent / 100);
    const grandTotal = subtotal + totalTax - discountAmount;

    document.getElementById('subtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('totalTax').textContent = `₹${totalTax.toFixed(2)}`;
    document.getElementById('discountAmount').textContent = `₹${discountAmount.toFixed(2)}`;
    document.getElementById('grandTotal').textContent = `₹${grandTotal.toFixed(2)}`;
}

/**
 * Clear cart
 */
function clearCart() {
    if (cart.length === 0) return;
    if (!confirm('Clear all items from cart?')) return;
    cart = [];
    updateCartDisplay();
}

/**
 * Complete bill
 */
async function completeBill() {
    if (cart.length === 0) {
        alert('Cart is empty');
        return;
    }

    try {
        // Update product quantities
        for (const item of cart) {
            const product = await productsDB.getById(item.productId);
            if (product) {
                if (product.quantityOnHand < item.quantity) {
                    alert(`Insufficient quantity for ${product.name}`);
                    return;
                }
                product.quantityOnHand -= item.quantity;
                await productsDB.update(product);
            }
        }

        // Calculate totals
        let subtotal = 0;
        let totalTax = 0;
        cart.forEach(item => {
            const lineTotal = item.quantity * item.unitPrice;
            subtotal += lineTotal;
            totalTax += (lineTotal * item.taxPercent) / 100;
        });
        const discountPercent = parseFloat(document.getElementById('billDiscount').value) || 0;
        const discountAmount = (subtotal + totalTax) * (discountPercent / 100);
        const grandTotal = subtotal + totalTax - discountAmount;

        // Create transaction
        const transaction = {
            date: new Date().toISOString(),
            items: cart.map(item => ({
                productId: item.productId,
                name: item.name,
                barcode: item.barcode,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxPercent: item.taxPercent,
                unit: item.unit
            })),
            subtotal: subtotal,
            totalTax: totalTax,
            discount: discountAmount,
            grandTotal: grandTotal,
            paymentMethod: 'Cash' // Default, can be extended
        };

        await transactionsDB.add(transaction);

        alert(`Bill completed! Total: ₹${grandTotal.toFixed(2)}`);
        cart = [];
        document.getElementById('billDiscount').value = 0;
        updateCartDisplay();
        updateDashboard();
    } catch (error) {
        console.error('Error completing bill:', error);
        alert('Failed to complete bill');
    }
}

/**
 * Print invoice
 */
function printInvoice() {
    if (cart.length === 0) {
        alert('Cart is empty');
        return;
    }

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    cart.forEach(item => {
        const lineTotal = item.quantity * item.unitPrice;
        subtotal += lineTotal;
        totalTax += (lineTotal * item.taxPercent) / 100;
    });
    const discountPercent = parseFloat(document.getElementById('billDiscount').value) || 0;
    const discountAmount = (subtotal + totalTax) * (discountPercent / 100);
    const grandTotal = subtotal + totalTax - discountAmount;

    // Populate invoice template
    const invoiceDate = new Date().toLocaleString();
    const invoiceNumber = 'INV-' + Date.now();

    document.getElementById('invoiceDate').textContent = invoiceDate;
    document.getElementById('invoiceNumber').textContent = invoiceNumber;

    const invoiceItems = cart.map(item => {
        const lineTotal = item.quantity * item.unitPrice;
        const taxAmount = (lineTotal * item.taxPercent) / 100;
        const totalWithTax = lineTotal + taxAmount;

        return `
            <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(item.barcode)}</td>
                <td>${item.quantity} ${escapeHtml(item.unit)}</td>
                <td>₹${item.unitPrice.toFixed(2)}</td>
                <td>₹${taxAmount.toFixed(2)}</td>
                <td>₹${totalWithTax.toFixed(2)}</td>
            </tr>
        `;
    }).join('');

    document.getElementById('invoiceItems').innerHTML = invoiceItems;
    document.getElementById('invoiceSubtotal').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('invoiceTotalTax').textContent = `₹${totalTax.toFixed(2)}`;
    document.getElementById('invoiceDiscount').textContent = `₹${discountAmount.toFixed(2)}`;
    document.getElementById('invoiceGrandTotal').textContent = `₹${grandTotal.toFixed(2)}`;

    // Print
    window.print();
}

// ==================== BARCODE SCANNING ====================

/**
 * Open scanner modal
 */
function openScannerModal() {
    const modal = document.getElementById('scannerModal');
    modal.style.display = 'block';
    
    if (typeof startScanning === 'function') {
        startScanning(
            (barcode) => {
                closeScannerModal();
                handleScannedBarcode(barcode);
            },
            (error) => {
                const statusEl = document.getElementById('scannerStatus');
                if (statusEl) {
                    statusEl.textContent = 'Error: ' + error;
                }
            }
        );
    } else {
        alert('Scanner not available. Please ensure ZXing library is loaded.');
    }
}

/**
 * Close scanner modal
 */
function closeScannerModal() {
    const modal = document.getElementById('scannerModal');
    modal.style.display = 'none';
    if (typeof stopScanning === 'function') {
        stopScanning();
    }
}

/**
 * Handle scanned barcode
 */
async function handleScannedBarcode(barcode) {
    try {
        const product = await productsDB.getByBarcode(barcode);
        if (product) {
            addToCart(product.id, 1);
        } else {
            if (confirm(`Product with barcode "${barcode}" not found. Create new product?`)) {
                document.getElementById('barcode').value = barcode;
                switchSection('products');
                openProductModal();
            }
        }
    } catch (error) {
        console.error('Error handling scanned barcode:', error);
        alert('Error processing barcode');
    }
}

/**
 * Add product by manually entered barcode
 */
async function addProductByBarcode() {
    const barcode = document.getElementById('manualBarcode').value.trim();
    if (!barcode) {
        alert('Please enter a barcode');
        return;
    }

    await handleScannedBarcode(barcode);
    document.getElementById('manualBarcode').value = '';
}

// ==================== DASHBOARD ====================

/**
 * Set date range
 */
function setDateRange(range) {
    currentDateRange = range;
    
    document.querySelectorAll('.date-range-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.range === range) {
            btn.classList.add('active');
        }
    });

    const customRangeDiv = document.getElementById('customDateRange');
    if (range === 'custom') {
        customRangeDiv.style.display = 'flex';
    } else {
        customRangeDiv.style.display = 'none';
        updateDashboard();
    }
}

/**
 * Update dashboard
 */
async function updateDashboard(startDate = null, endDate = null) {
    let start, end;

    if (startDate && endDate) {
        start = startDate;
        end = endDate;
    } else {
        const now = new Date();
        switch (currentDateRange) {
            case 'today':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
                break;
            case 'week':
                const dayOfWeek = now.getDay();
                start = new Date(now);
                start.setDate(now.getDate() - dayOfWeek);
                start.setHours(0, 0, 0, 0);
                end = new Date(now);
                end.setHours(23, 59, 59);
                break;
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
            default:
                start = new Date(0);
                end = new Date();
        }
    }

    try {
        const transactions = await transactionsDB.getByDateRange(start, end);
        const expenses = await expensesDB.getByDateRange(start, end);

        const totalIncome = transactions.reduce((sum, t) => sum + t.grandTotal, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = totalIncome - totalExpenses;

        document.getElementById('totalIncome').textContent = `₹${totalIncome.toFixed(2)}`;
        document.getElementById('totalExpenses').textContent = `₹${totalExpenses.toFixed(2)}`;
        document.getElementById('netProfit').textContent = `₹${netProfit.toFixed(2)}`;
        document.getElementById('netProfit').className = 'stat-value ' + (netProfit >= 0 ? 'positive' : 'negative');

        // Update chart
        updateChart(transactions, expenses, start, end);

        // Update transactions list
        displayTransactions(transactions, expenses);
    } catch (error) {
        console.error('Error updating dashboard:', error);
    }
}

/**
 * Update chart
 */
function updateChart(transactions, expenses, startDate, endDate) {
    const ctx = document.getElementById('incomeExpenseChart').getContext('2d');

    // Group by date
    const incomeByDate = {};
    const expenseByDate = {};

    transactions.forEach(t => {
        const date = new Date(t.date).toLocaleDateString();
        incomeByDate[date] = (incomeByDate[date] || 0) + t.grandTotal;
    });

    expenses.forEach(e => {
        const date = new Date(e.date).toLocaleDateString();
        expenseByDate[date] = (expenseByDate[date] || 0) + e.amount;
    });

    const allDates = [...new Set([...Object.keys(incomeByDate), ...Object.keys(expenseByDate)])].sort();

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: allDates,
            datasets: [
                {
                    label: 'Income',
                    data: allDates.map(d => incomeByDate[d] || 0),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.1
                },
                {
                    label: 'Expenses',
                    data: allDates.map(d => expenseByDate[d] || 0),
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

/**
 * Display transactions
 */
function displayTransactions(transactions, expenses) {
    const container = document.getElementById('transactionsList');
    const allTransactions = [
        ...transactions.map(t => ({ ...t, type: 'income' })),
        ...expenses.map(e => ({ ...e, type: 'expense' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);

    if (allTransactions.length === 0) {
        container.innerHTML = '<p class="empty-message">No transactions found</p>';
        return;
    }

    container.innerHTML = allTransactions.map(t => {
        if (t.type === 'income') {
            return `
                <div class="transaction-item income">
                    <div class="transaction-details">
                        <strong>Sale</strong> - ${new Date(t.date).toLocaleString()}
                        <div>${t.items.length} item(s)</div>
                    </div>
                    <div class="transaction-amount positive">+₹${t.grandTotal.toFixed(2)}</div>
                </div>
            `;
        } else {
            return `
                <div class="transaction-item expense">
                    <div class="transaction-details">
                        <strong>${escapeHtml(t.category)}</strong> - ${new Date(t.date).toLocaleString()}
                        <div>${escapeHtml(t.note || '')}</div>
                    </div>
                    <div class="transaction-amount negative">-₹${t.amount.toFixed(2)}</div>
                </div>
            `;
        }
    }).join('');
}

/**
 * Handle expense form submission
 */
async function handleExpenseSubmit(e) {
    e.preventDefault();

    const expense = {
        date: document.getElementById('expenseDate').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        category: document.getElementById('expenseCategory').value.trim(),
        note: document.getElementById('expenseNote').value.trim()
    };

    if (expense.amount <= 0) {
        alert('Amount must be greater than 0');
        return;
    }

    try {
        await expensesDB.add(expense);
        document.getElementById('expenseForm').reset();
        updateDashboard();
        alert('Expense added successfully');
    } catch (error) {
        console.error('Error adding expense:', error);
        alert('Failed to add expense');
    }
}

// ==================== DATA MANAGEMENT ====================

/**
 * Handle loading data files manually
 */
let filesToLoad = { products: false, transactions: false, expenses: false };

async function handleLoadDataFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const reader = new FileReader();

    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target.result);
            
            if (fileName.includes('products')) {
                updateCache('products', data);
                filesToLoad.products = true;
                loadProducts();
                alert('Products loaded! Now load transactions.json and expenses.json');
                document.getElementById('loadTransactionsFile').click();
            } else if (fileName.includes('transactions')) {
                updateCache('transactions', data);
                filesToLoad.transactions = true;
                alert('Transactions loaded! Now load expenses.json');
                document.getElementById('loadExpensesFile').click();
            } else if (fileName.includes('expenses')) {
                updateCache('expenses', data);
                filesToLoad.expenses = true;
                updateDashboard();
                alert('All data files loaded successfully!');
                filesToLoad = { products: false, transactions: false, expenses: false };
            }
        } catch (error) {
            console.error('Error loading file:', error);
            alert('Failed to load file. Please check the file format.');
        }
    };

    reader.readAsText(file);
    e.target.value = ''; // Reset file input
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

