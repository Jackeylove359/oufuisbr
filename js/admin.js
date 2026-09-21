/**
 * admin.js - 后台管理模块
 * 负责：管理员登录、产品 CRUD、客户注册、查看/清空所有购物车
 * 使用 ES6+ 特性：async/await、模板字面量、箭头函数、解构赋值、展开运算符、默认参数
 *
 * IIFE 隔离：全部代码包裹在立即执行函数内，所有顶层 const/let 都封闭在
 *           函数作用域中，避免与 storage.js / main.js 的全局同名标识符冲突
 *           （历史 bug：原顶层 const addProduct 与 storage.js 顶层 const addProduct
 *            同名共享全局词法作用域，触发 SyntaxError: Identifier 'addProduct' has already been declared）
 *           对外仅通过 window.Admin 暴露公共方法。
 */
(function () {
  'use strict';

// ES6: 分类映射表（与 products.js 保持一致）
const ADMIN_CATEGORIES = {
  parts: 'Parts Catalog',
  ecommerce: 'Ecommerce',
  service: 'Service Management',
  analytics: 'Data Analytics',
  ai: 'AI'
};

/**
 * 管理员登录（硬编码 admin/admin123）
 */
const adminLogin = () => {
  const username = document.getElementById('adminLoginUser').value.trim();
  const password = document.getElementById('adminLoginPass').value;

  // 表单验证
  if (!Validation.validateRequired(username)) {
    Validation.showFieldError('adminLoginUser', 'Username is required');
    return;
  }
  if (!Validation.validateRequired(password)) {
    Validation.showFieldError('adminLoginPass', 'Password is required');
    return;
  }

  // 硬编码账号校验
  if (username === 'admin' && password === 'admin123') {
    Storage.setLoginState(username, 'admin');
    Main.showToast('Welcome, Administrator!', 'success');
    showAdminPanel();
  } else {
    Main.showToast('Invalid admin credentials', 'error');
  }
};

/**
 * 退出管理员登录
 */
const adminLogout = () => {
  Storage.logout();
  Main.showToast('Logged out', 'info');
  showLoginScreen();
};

/**
 * 显示登录界面
 */
const showLoginScreen = () => {
  const loginWrap = document.getElementById('adminLoginWrap');
  const panel = document.getElementById('adminPanel');
  if (loginWrap) loginWrap.classList.remove('hidden');
  if (panel) panel.classList.add('hidden');
};

/**
 * 显示管理后台主面板
 */
const showAdminPanel = () => {
  const loginWrap = document.getElementById('adminLoginWrap');
  const panel = document.getElementById('adminPanel');
  if (loginWrap) loginWrap.classList.add('hidden');
  if (panel) panel.classList.remove('hidden');

  // 默认显示产品标签
  switchTab('products');
};

/**
 * 切换标签页（ES6 箭头函数）
 * @param {string} tab - 标签 ID: products / customers / carts
 */
const switchTab = (tab) => {
  // 更新标签按钮状态
  document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
  const activeTab = document.querySelector(`.admin-tab[data-tab="${tab}"]`);
  if (activeTab) activeTab.classList.add('active');

  // 切换面板内容
  const content = document.getElementById('adminContent');
  if (!content) return;

  // ES6: switch 根据标签渲染对应内容
  switch (tab) {
    case 'products':
      renderAdminProductsPanel(content);
      break;
    case 'customers':
      renderAdminCustomersPanel(content);
      break;
    case 'carts':
      renderAdminCartsPanel(content);
      break;
    case 'register':
      renderRegisterCustomerPanel(content);
      break;
    default:
      renderAdminProductsPanel(content);
  }
};

/**
 * 渲染产品管理面板（添加表单 + 产品列表）
 */
const renderAdminProductsPanel = (container) => {
  container.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; padding-bottom:12px; border-bottom:2px solid var(--border);">
      <h3><i class="fa-solid fa-box"></i> Product Management</h3>
      <button class="btn btn-ghost btn-sm" onclick="Admin.adminLogout()">
        <i class="fa-solid fa-right-from-bracket"></i> Logout
      </button>
    </div>
    <div id="addProductFormWrap"></div>
    <div id="adminProductsList" class="mt-4"></div>`;

  renderAddProductForm();
  renderAdminProductsList();
};

/**
 * 渲染添加产品表单
 */
const renderAddProductForm = () => {
  const wrap = document.getElementById('addProductFormWrap');
  if (!wrap) return;

  // ES6: Object.entries 生成分类选项
  const categoryOptions = Object.entries(ADMIN_CATEGORIES)
    .map(([code, label]) => `<option value="${code}">${label}</option>`)
    .join('');

  // ES6: 模板字面量
  wrap.innerHTML = `
    <div style="background: var(--bg); padding: 24px; border-radius: 12px; margin-bottom: 24px;">
      <h4 style="margin-bottom: 16px;"><i class="fa-solid fa-plus-circle"></i> Add New Product</h4>
      <form id="addProductForm" onsubmit="event.preventDefault(); Admin.addProduct();">
        <div class="form-row">
          <div class="form-group">
            <label>Product Name <span class="required">*</span></label>
            <input type="text" class="form-control" id="newProductName" placeholder="e.g. Microcat EPC"
                   oninput="Validation.clearFieldError('newProductName')">
          </div>
          <div class="form-group">
            <label>Price ($/mo) <span class="required">*</span></label>
            <input type="number" class="form-control" id="newProductPrice" placeholder="299" min="1" step="0.01"
                   oninput="Validation.clearFieldError('newProductPrice')">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Category <span class="required">*</span></label>
            <select class="form-control" id="newProductCategory">
              ${categoryOptions}
            </select>
          </div>
          <div class="form-group">
            <label>Stock <span class="required">*</span></label>
            <input type="number" class="form-control" id="newProductStock" placeholder="50" min="0"
                   oninput="Validation.clearFieldError('newProductStock')">
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea class="form-control" id="newProductDesc" placeholder="Brief product description..."></textarea>
        </div>
        <div class="form-group">
          <label>Image URL</label>
          <input type="text" class="form-control" id="newProductImage" placeholder="https://..."
                 oninput="Admin.previewImage(this.value)">
          <div class="image-preview" id="imagePreview">
            <span class="placeholder">Preview (150×150)</span>
          </div>
        </div>
        <button type="submit" class="btn btn-primary">
          <i class="fa-solid fa-plus"></i> Add Product
        </button>
      </form>
    </div>`;
};

/**
 * 图片预览（150×150）
 * @param {string} url - 图片 URL
 */
const previewImage = (url) => {
  const preview = document.getElementById('imagePreview');
  if (!preview) return;
  if (!url.trim()) {
    preview.innerHTML = '<span class="placeholder">Preview (150×150)</span>';
    return;
  }
  // ES6: 模板字面量
  preview.innerHTML = `<img src="${url}" alt="Preview" onerror="this.parentElement.innerHTML='<span class=\\'placeholder\\'>Invalid URL</span>'">`;
};

/**
 * 添加产品（ES6 解构赋值 + 表单验证）
 * #1 修复：原 const addProduct 与 storage.js 顶层 const addProduct 同名，
 *         在共享全局作用域下触发 SyntaxError: Identifier 'addProduct' has already been declared。
 *         重命名为 addProductFromForm，对外仍以 Admin.addProduct 暴露（见文件末导出）。
 */
const addProductFromForm = () => {
  // ES6: 收集表单值
  const name = document.getElementById('newProductName').value.trim();
  const price = document.getElementById('newProductPrice').value;
  const category = document.getElementById('newProductCategory').value;
  const stock = document.getElementById('newProductStock').value;
  const description = document.getElementById('newProductDesc').value.trim();
  let image = document.getElementById('newProductImage').value.trim();

  // 默认图片（若未填写）
  if (!image) {
    image = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(name + ' automotive software')}&image_size=square`;
  }

  // 表单验证（ES6 validateForm）
  const isValid = Validation.validateForm([
    { fieldId: 'newProductName', value: name, type: 'required', message: 'Product name is required' },
    { fieldId: 'newProductPrice', value: price, type: 'price', message: 'Price must be a positive number' },
    { fieldId: 'newProductStock', value: stock, type: 'stock', message: 'Stock must be a non-negative integer' }
  ]);

  if (!isValid) return;

  // ES6: 展开运算符构造产品对象
  const newProduct = { name, price: Number(price), category, stock: Number(stock), description, image };
  Storage.addProduct(newProduct);
  Main.showToast('Product added successfully!', 'success');

  // 重置表单
  document.getElementById('addProductForm').reset();
  previewImage('');

  // 刷新产品列表
  renderAdminProductsList();
};

/**
 * 渲染管理后台产品列表（带编辑/删除）
 */
const renderAdminProductsList = () => {
  const wrap = document.getElementById('adminProductsList');
  if (!wrap) return;

  const products = Storage.getProducts() || [];

  if (products.length === 0) {
    wrap.innerHTML = '<p class="text-muted text-center mt-3">No products yet. Add one above.</p>';
    return;
  }

  // ES6: 模板字面量生成表格
  wrap.innerHTML = `
    <h4 style="margin-bottom:12px;">All Products (${products.length})</h4>
    <div style="overflow-x:auto;">
      <table class="admin-table">
        <thead>
          <tr>
            <th>Image</th>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${products
            .map((p) => `
              <tr>
                <td><img src="${p.image}" alt="${p.name}" class="admin-product-thumb"
                     onerror="this.src='https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=product&image_size=square'"></td>
                <td><strong>${p.name}</strong></td>
                <td><span class="badge badge-info">${ADMIN_CATEGORIES[p.category] || p.category}</span></td>
                <td>$${p.price}/mo</td>
                <td>${p.stock < 5 ? `<span class="badge badge-danger">${p.stock} low</span>` : `<span class="badge badge-success">${p.stock}</span>`}</td>
                <td>
                  <button class="btn btn-outline btn-sm" onclick="Admin.editProduct(${p.id})">
                    <i class="fa-solid fa-pen"></i>
                  </button>
                  <button class="btn btn-danger btn-sm" onclick="Admin.deleteProduct(${p.id})">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </td>
              </tr>`)
            .join('')}
        </tbody>
      </table>
    </div>`;
};

/**
 * 编辑产品（弹出 Modal，可修改所有字段）
 * @param {number} id - 产品 ID
 */
const editProduct = (id) => {
  const product = Storage.getProductById(id);
  if (!product) return;

  // ES6: 解构赋值
  const { name, price, category, stock, image, description } = product;
  const categoryOptions = Object.entries(ADMIN_CATEGORIES)
    .map(([code, label]) => `<option value="${code}" ${code === category ? 'selected' : ''}>${label}</option>`)
    .join('');

  // 创建编辑 Modal（ES6 模板字面量）
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.id = 'editModalOverlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3><i class="fa-solid fa-pen"></i> Edit Product</h3>
        <button class="modal-close" onclick="document.getElementById('editModalOverlay').remove(); document.body.style.overflow='';">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body">
        <form id="editProductForm" onsubmit="event.preventDefault(); Admin.saveEditProduct(${id});">
          <div class="form-group">
            <label>Product Name <span class="required">*</span></label>
            <input type="text" class="form-control" id="editName" value="${name}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Price ($/mo) <span class="required">*</span></label>
              <input type="number" class="form-control" id="editPrice" value="${price}" min="1" step="0.01">
            </div>
            <div class="form-group">
              <label>Stock <span class="required">*</span></label>
              <input type="number" class="form-control" id="editStock" value="${stock}" min="0">
            </div>
          </div>
          <div class="form-group">
            <label>Category</label>
            <select class="form-control" id="editCategory">${categoryOptions}</select>
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea class="form-control" id="editDesc">${description || ''}</textarea>
          </div>
          <div class="form-group">
            <label>Image URL</label>
            <input type="text" class="form-control" id="editImage" value="${image}">
          </div>
          <div style="display:flex; gap:10px; margin-top:20px;">
            <button type="button" class="btn btn-ghost" onclick="document.getElementById('editModalOverlay').remove(); document.body.style.overflow='';">Cancel</button>
            <button type="submit" class="btn btn-primary"><i class="fa-solid fa-save"></i> Save Changes</button>
          </div>
        </form>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
};

/**
 * 保存编辑后的产品（ES6 解构赋值）
 * @param {number} id - 产品 ID
 */
const saveEditProduct = (id) => {
  // ES6: 收集编辑后的值
  const name = document.getElementById('editName').value.trim();
  const price = document.getElementById('editPrice').value;
  const stock = document.getElementById('editStock').value;
  const category = document.getElementById('editCategory').value;
  const description = document.getElementById('editDesc').value.trim();
  const image = document.getElementById('editImage').value.trim();

  // 验证
  if (!name || !price || price <= 0 || stock < 0) {
    Main.showToast('Please fill all required fields correctly', 'error');
    return;
  }

  // ES6: 展开运算符构造更新对象
  const updates = { name, price: Number(price), stock: Number(stock), category, description, image };
  Storage.updateProduct(id, updates);
  Main.showToast('Product updated!', 'success');

  // 关闭弹窗
  document.getElementById('editModalOverlay').remove();
  document.body.style.overflow = '';

  // 刷新列表
  renderAdminProductsList();
};

/**
 * 删除产品（需确认）
 * @param {number} id - 产品 ID
 */
const deleteProduct = (id) => {
  const product = Storage.getProductById(id);
  if (!product) return;

  // 确认弹窗
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.id = 'delConfirmOverlay';
  overlay.innerHTML = `
    <div class="modal" style="max-width: 420px;">
      <div class="modal-header">
        <h3><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> Confirm Delete</h3>
        <button class="modal-close" onclick="document.getElementById('delConfirmOverlay').remove(); document.body.style.overflow='';">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body text-center">
        <p style="margin-bottom: 24px;">Are you sure you want to delete <strong>${product.name}</strong>? This cannot be undone.</p>
        <div style="display:flex; gap:10px; justify-content:center;">
          <button class="btn btn-ghost" onclick="document.getElementById('delConfirmOverlay').remove(); document.body.style.overflow='';">Cancel</button>
          <button class="btn btn-danger" id="confirmDelBtn">Delete</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  document.getElementById('confirmDelBtn').addEventListener('click', () => {
    Storage.deleteProduct(id);
    Main.showToast('Product deleted', 'info');
    overlay.remove();
    document.body.style.overflow = '';
    renderAdminProductsList();
  });
};

/**
 * 渲染客户管理面板（查看所有已注册客户）
 */
const renderAdminCustomersPanel = (container) => {
  const customers = Storage.getCustomers();

  // ES6: 模板字面量
  container.innerHTML = `
    <h3 style="margin-bottom:20px; padding-bottom:12px; border-bottom:2px solid var(--border);">
      <i class="fa-solid fa-users"></i> Customer Management
    </h3>
    ${customers.length === 0 ? `
      <div class="empty-cart">
        <i class="fa-solid fa-user-slash"></i>
        <h3>No customers yet</h3>
        <p>Registered customers will appear here.</p>
        <button class="btn btn-primary" onclick="Admin.switchTab('register')">
          <i class="fa-solid fa-user-plus"></i> Register Customer
        </button>
      </div>
    ` : `
      <p class="mb-3">Total registered customers: <strong>${customers.length}</strong></p>
      <div style="overflow-x:auto;">
        <table class="admin-table">
          <thead>
            <tr><th>Username</th><th>Full Name</th><th>Email</th><th>Phone</th><th>Registered</th></tr>
          </thead>
          <tbody>
            ${customers
              .map((c) => `
                <tr>
                  <td><strong>${c.username}</strong></td>
                  <td>${c.fullName}</td>
                  <td>${c.email}</td>
                  <td>${c.phone}</td>
                  <td>${new Date(c.registeredAt).toLocaleDateString()}</td>
                </tr>`)
              .join('')}
          </tbody>
        </table>
      </div>
    `}`;
};

/**
 * 渲染客户注册表单
 */
const renderRegisterCustomerPanel = (container) => {
  container.innerHTML = `
    <h3 style="margin-bottom:20px; padding-bottom:12px; border-bottom:2px solid var(--border);">
      <i class="fa-solid fa-user-plus"></i> Register New Customer
    </h3>
    <form id="registerForm" onsubmit="event.preventDefault(); Admin.registerCustomer();" style="max-width:560px;">
      <div class="form-row">
        <div class="form-group">
          <label>Username <span class="required">*</span></label>
          <input type="text" class="form-control" id="regUsername" placeholder="Choose a username"
                 oninput="Validation.clearFieldError('regUsername')">
        </div>
        <div class="form-group">
          <label>Full Name <span class="required">*</span></label>
          <input type="text" class="form-control" id="regFullname" placeholder="John Smith"
                 oninput="Validation.clearFieldError('regFullname')">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Email <span class="required">*</span></label>
          <input type="email" class="form-control" id="regEmail" placeholder="john@dealer.com"
                 oninput="Validation.clearFieldError('regEmail')">
        </div>
        <div class="form-group">
          <label>Phone <span class="required">*</span></label>
          <input type="text" class="form-control" id="regPhone" placeholder="+61 4xx xxx xxx"
                 oninput="Validation.clearFieldError('regPhone')">
        </div>
      </div>
      <div class="form-group">
        <label>Password <span class="required">*</span></label>
        <input type="password" class="form-control" id="regPassword" placeholder="At least 6 characters"
               oninput="Validation.clearFieldError('regPassword')">
      </div>
      <button type="submit" class="btn btn-primary">
        <i class="fa-solid fa-user-check"></i> Register Customer
      </button>
    </form>`;
};

/**
 * 注册客户（ES6 表单验证 + localStorage 存储）
 * 注册成功跳转确认页
 */
const registerCustomer = () => {
  // ES6: 收集表单值
  const username = document.getElementById('regUsername').value.trim();
  const fullName = document.getElementById('regFullname').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const password = document.getElementById('regPassword').value;

  // ES6: 统一表单验证
  const isValid = Validation.validateForm([
    { fieldId: 'regUsername', value: username, type: 'required', message: 'Username is required' },
    { fieldId: 'regFullname', value: fullName, type: 'required', message: 'Full name is required' },
    { fieldId: 'regEmail', value: email, type: 'email', message: 'Please enter a valid email' },
    { fieldId: 'regPhone', value: phone, type: 'phone', message: 'Please enter a valid phone number' },
    { fieldId: 'regPassword', value: password, type: 'password', message: 'Password must be at least 6 characters' }
  ]);

  if (!isValid) return;

  // 检查用户名是否已存在
  const existing = Storage.getCustomerByUsername(username);
  if (existing) {
    Validation.showFieldError('regUsername', 'This username is already taken');
    return;
  }

  // 保存客户（ES6 展开运算符）
  const success = Storage.addCustomer({ username, fullName, email, phone, password });
  if (success) {
    Main.showToast('Customer registered successfully!', 'success');
    // 保存注册信息用于确认页展示
    sessionStorage.setItem('infomedia_last_register', JSON.stringify({ username, fullName, email, phone }));
    // 跳转确认页（ES6 模板字面量拼接 URL）
    setTimeout(() => {
      window.location.href = `admin.html?registered=1&name=${encodeURIComponent(fullName)}`;
    }, 800);
  } else {
    Main.showToast('Registration failed', 'error');
  }
};

/**
 * 渲染购物车管理面板（查看/清空所有购物车）
 */
const renderAdminCartsPanel = (container) => {
  const cart = Storage.getCart();

  // ES6: 模板字面量
  container.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; padding-bottom:12px; border-bottom:2px solid var(--border);">
      <h3><i class="fa-solid fa-cart-flatbed"></i> Cart Management</h3>
      ${cart.length > 0 ? `<button class="btn btn-danger btn-sm" onclick="Admin.clearAllCarts()">
        <i class="fa-solid fa-trash"></i> Clear All Carts
      </button>` : ''}
    </div>
    <p class="mb-3">Current cart items across all sessions: <strong>${cart.length}</strong></p>
    ${cart.length === 0 ? `
      <div class="empty-cart">
        <i class="fa-solid fa-cart-shopping"></i>
        <h3>All carts are empty</h3>
        <p>There are no items in any shopping cart.</p>
      </div>
    ` : `
      <div style="overflow-x:auto;">
        <table class="admin-table">
          <thead>
            <tr><th>Image</th><th>Product</th><th>Price</th><th>Qty</th><th>Line Total</th></tr>
          </thead>
          <tbody>
            ${cart
              .map((item) => `
                <tr>
                  <td><img src="${item.image}" alt="${item.name}" class="admin-product-thumb"
                       onerror="this.src='https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=product&image_size=square'"></td>
                  <td><strong>${item.name}</strong></td>
                  <td>$${item.price.toFixed(2)}</td>
                  <td>${item.quantity}</td>
                  <td>$${(item.price * item.quantity).toFixed(2)}</td>
                </tr>`)
              .join('')}
          </tbody>
        </table>
      </div>
    `}`;
};

/**
 * 清空所有购物车（需确认）
 */
const clearAllCarts = () => {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.id = 'clearCartConfirm';
  overlay.innerHTML = `
    <div class="modal" style="max-width: 420px;">
      <div class="modal-header">
        <h3><i class="fa-solid fa-triangle-exclamation" style="color:var(--danger);"></i> Confirm</h3>
        <button class="modal-close" onclick="document.getElementById('clearCartConfirm').remove(); document.body.style.overflow='';">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="modal-body text-center">
        <p style="margin-bottom: 24px;">Clear all shopping cart items? This affects all customers.</p>
        <div style="display:flex; gap:10px; justify-content:center;">
          <button class="btn btn-ghost" onclick="document.getElementById('clearCartConfirm').remove(); document.body.style.overflow='';">Cancel</button>
          <button class="btn btn-danger" id="confirmClearAllBtn">Clear All</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  document.getElementById('confirmClearAllBtn').addEventListener('click', () => {
    Storage.clearCart();
    Storage.clearCoupon();
    Main.updateCartBadge();
    Main.showToast('All carts cleared', 'info');
    overlay.remove();
    document.body.style.overflow = '';
    switchTab('carts');
  });
};

/**
 * 后台页初始化（ES6 箭头函数）
 * 检查登录状态：已登录显示面板，未登录显示登录表单
 */
const initAdminPage = async () => {
  // 确保产品数据已加载
  await Main.ensureProductsLoaded();

  const login = Storage.getLoginState();
  if (login.isLoggedIn && login.role === 'admin') {
    showAdminPanel();
  } else {
    showLoginScreen();
  }

  // 处理注册成功跳转的确认信息
  const params = new URLSearchParams(window.location.search);
  if (params.get('registered') === '1') {
    const name = params.get('name') || 'Customer';
    setTimeout(() => {
      showRegistrationConfirm(name);
    }, 600);
  }
};

/**
 * 显示注册成功确认弹窗
 */
const showRegistrationConfirm = (name) => {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.id = 'regConfirm';
  overlay.innerHTML = `
    <div class="modal" style="max-width: 440px;">
      <div class="modal-body text-center" style="padding: 40px;">
        <div style="width:80px; height:80px; margin:0 auto 20px; border-radius:50%; background:var(--success); display:flex; align-items:center; justify-content:center;">
          <i class="fa-solid fa-check" style="color:#fff; font-size:2.5rem;"></i>
        </div>
        <h3 style="margin-bottom: 12px;">Registration Successful!</h3>
        <p style="color:var(--text-muted); margin-bottom: 8px;">Customer <strong>${name}</strong> has been registered.</p>
        <p style="color:var(--text-muted); font-size:0.88rem; margin-bottom: 24px;">They can now log in at the cart page to place orders.</p>
        <button class="btn btn-primary" onclick="document.getElementById('regConfirm').remove(); document.body.style.overflow='';">Got it</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      document.body.style.overflow = '';
    }
  });
};

// 暴露 API（IIFE 内部赋值给 window.Admin，对外仍以 Admin.xxx 形式调用）
window.Admin = {
  adminLogin, adminLogout, showLoginScreen, showAdminPanel, switchTab,
  renderAdminProductsPanel, renderAddProductForm, previewImage,
  // 本地函数 addProductFromForm 通过别名对外暴露为 Admin.addProduct，
  // 保持 admin.html 表单 onsubmit="Admin.addProduct()" 调用不变
  addProduct: addProductFromForm,
  renderAdminProductsList, editProduct, saveEditProduct, deleteProduct,
  renderAdminCustomersPanel, renderRegisterCustomerPanel, registerCustomer,
  renderAdminCartsPanel, clearAllCarts, initAdminPage, showRegistrationConfirm
};

})();
