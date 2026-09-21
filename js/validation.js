/**
 * validation.js - 表单验证模块
 * 提供统一的表单验证工具：邮箱、电话、必填、星级评分等
 * 所有函数返回 boolean，并通过 showFieldError 显示友好错误提示
 * 使用 ES6+ 特性：箭头函数、默认参数、模板字面量、正则表达式
 */

// ES6: const 定义邮箱正则（标准 RFC 5322 简化版）
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// 电话正则：支持国际格式，如 +61 2 9454 1500、(02) 9454 1500、0412-345-678
const PHONE_REGEX = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{2,8}([-\s.]?[0-9]{2,8})*$/;

/**
 * 验证必填字段（ES6 默认参数）
 * @param {string} value - 输入值
 * @returns {boolean} 是否非空
 */
const validateRequired = (value = '') => {
  // ES6: trim() 去除首尾空格后判断长度
  return value.trim().length > 0;
};

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱字符串
 * @returns {boolean} 是否合法
 */
const validateEmail = (email = '') => {
  return EMAIL_REGEX.test(email.trim());
};

/**
 * 验证电话格式
 * @param {string} phone - 电话字符串
 * @returns {boolean} 是否合法
 */
const validatePhone = (phone = '') => {
  // 移除所有空格、括号、横线后检查是否至少 7 位数字
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length < 7) return false;
  return PHONE_REGEX.test(phone.trim());
};

/**
 * 验证星级评分（至少 1 星）
 * @param {number} rating - 评分值
 * @returns {boolean} 是否有效
 */
const validateRating = (rating = 0) => {
  // ES6: Number 转换 + 范围校验
  const num = Number(rating);
  return num >= 1 && num <= 5;
};

/**
 * 验证密码长度（至少 6 位）
 * @param {string} password - 密码
 * @returns {boolean} 是否合法
 */
const validatePassword = (password = '') => {
  return password.length >= 6;
};

/**
 * 验证价格是否为正数
 * @param {number|string} price - 价格
 * @returns {boolean} 是否合法
 */
const validatePrice = (price) => {
  const num = Number(price);
  return !isNaN(num) && num > 0;
};

/**
 * 验证库存是否为非负整数
 * @param {number|string} stock - 库存
 * @returns {boolean} 是否合法
 */
const validateStock = (stock) => {
  const num = Number(stock);
  return !isNaN(num) && num >= 0 && Number.isInteger(num);
};

/**
 * 显示字段错误提示（ES6 模板字面量）
 * @param {string} fieldId - 字段输入框的 id
 * @param {string} message - 错误信息
 */
const showFieldError = (fieldId, message) => {
  const field = document.getElementById(fieldId);
  if (!field) return;

  // 添加错误样式
  field.classList.add('input-error');

  // 查找或创建错误提示元素
  // ES6: 模板字面量拼接 id
  let errorEl = document.getElementById(`${fieldId}-error`);
  if (!errorEl) {
    errorEl = document.createElement('div');
    errorEl.id = `${fieldId}-error`;
    errorEl.className = 'field-error';
    // 将错误提示插入到输入框之后
    field.parentNode.insertBefore(errorEl, field.nextSibling);
  }
  errorEl.textContent = message;
  errorEl.style.display = 'block';
};

/**
 * 清除字段错误提示
 * @param {string} fieldId - 字段输入框的 id
 */
const clearFieldError = (fieldId) => {
  const field = document.getElementById(fieldId);
  if (field) {
    field.classList.remove('input-error');
  }
  const errorEl = document.getElementById(`${fieldId}-error`);
  if (errorEl) {
    errorEl.style.display = 'none';
  }
};

/**
 * 清除一个表单内所有错误提示
 * @param {HTMLFormElement} form - 表单元素
 */
const clearAllErrors = (form) => {
  // ES6: querySelectorAll + forEach 箭头函数
  form.querySelectorAll('.input-error').forEach((el) => el.classList.remove('input-error'));
  form.querySelectorAll('.field-error').forEach((el) => (el.style.display = 'none'));
};

/**
 * 验证完整表单（通用验证器）
 * @param {Array} rules - 验证规则数组，每项：{ fieldId, value, type, message }
 * @returns {boolean} 整个表单是否通过
 */
const validateForm = (rules) => {
  let allValid = true;
  // ES6: 箭头函数遍历规则
  rules.forEach(({ fieldId, value, type, message }) => {
    let isValid = false;
    // ES6: switch 根据类型调用对应验证函数
    switch (type) {
      case 'required':
        isValid = validateRequired(value);
        break;
      case 'email':
        isValid = validateEmail(value);
        break;
      case 'phone':
        isValid = validatePhone(value);
        break;
      case 'rating':
        isValid = validateRating(value);
        break;
      case 'password':
        isValid = validatePassword(value);
        break;
      case 'price':
        isValid = validatePrice(value);
        break;
      case 'stock':
        isValid = validateStock(value);
        break;
      default:
        isValid = true;
    }
    if (!isValid) {
      showFieldError(fieldId, message);
      allValid = false;
    } else {
      clearFieldError(fieldId);
    }
  });
  return allValid;
};

// 暴露验证 API 到全局作用域
window.Validation = {
  validateRequired, validateEmail, validatePhone, validateRating,
  validatePassword, validatePrice, validateStock,
  showFieldError, clearFieldError, clearAllErrors, validateForm
};
