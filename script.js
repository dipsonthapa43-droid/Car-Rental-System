// State management
let CARS = [];
let USER_SESSION = null;
let ADMIN_BOOKINGS = [];

async function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId).classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const navLink = document.getElementById('nav-' + pageId);
  if (navLink) navLink.classList.add('active');

  window.scrollTo(0, 0);

  if (pageId === 'home') renderFeaturedCars();
  if (pageId === 'cars') renderAllCars();
  if (pageId === 'admin') updateAdminUI();
  if (pageId === 'mybookings') renderMyBookings();
  if (pageId === 'booking') prefillBookingForm();
}

async function fetchCars() {
  try {
    const res = await fetch('backend/get_cars.php');
    const data = await res.json();
    if (data.success) {
      CARS = data.cars;
      return true;
    }
  } catch (err) {
    console.error("Failed to fetch cars", err);
  }
  return false;
}

async function renderFeaturedCars() {
  if (CARS.length === 0) await fetchCars();
  const container = document.getElementById('featured-cars');
  if (!container) return;
  container.innerHTML = CARS.slice(0, 3).map(car => createCarCard(car)).join('');
}

async function renderAllCars(filteredCars = null) {
  if (CARS.length === 0) await fetchCars();
  // list must be assigned AFTER fetchCars has potentially re-assigned the global CARS array
  const list = filteredCars || CARS;
  const container = document.getElementById('all-cars');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--gray-400);">No vehicles match your search. Try different filters.</div>`;
    updateCount(0);
    return;
  }

  container.innerHTML = list.map(car => createCarCard(car)).join('');
  updateCount(list.length);
}

function updateCount(count) {
  const el = document.getElementById('cars-show-count');
  if (el) el.innerHTML = `Showing <strong>${count}</strong> vehicles`;
}

function applyFilters() {
  console.log("Applying filters...");
  const searchEl = document.getElementById('filter-search');
  const priceEl = document.getElementById('filter-price');
  const sortEl = document.getElementById('filter-sort');

  if (!searchEl || !priceEl || !sortEl) {
    console.error("Filter elements not found");
    return;
  }

  const query = searchEl.value.toLowerCase();
  const maxPrice = parseInt(priceEl.value);
  const sort = sortEl.value;

  const selectedCats = Array.from(document.querySelectorAll('.filter-cat:checked')).map(cb => cb.value);
  const selectedTrans = Array.from(document.querySelectorAll('.filter-trans:checked')).map(cb => cb.value);

  console.log("Query:", query, "MaxPrice:", maxPrice, "Cats:", selectedCats);

  let filtered = CARS.filter(car => {
    const matchesSearch = car.name.toLowerCase().includes(query);
    const matchesPrice = parseFloat(car.price_per_day) <= maxPrice;
    const matchesCat = selectedCats.length === 0 || selectedCats.includes(car.category);
    const matchesTrans = selectedTrans.length === 0 ||
      selectedTrans.some(t => car.transmission.toLowerCase().includes(t.toLowerCase()));

    return matchesSearch && matchesPrice && matchesCat && matchesTrans;
  });

  console.log("Filtered count:", filtered.length);

  // Sorting
  if (sort === 'low') filtered.sort((a, b) => a.price_per_day - b.price_per_day);
  else if (sort === 'high') filtered.sort((a, b) => b.price_per_day - a.price_per_day);
  else if (sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));

  renderAllCars(filtered);
}

function createCarCard(car) {
  // Use a fallback for thumbnail since we don't have images yet
  const thumb = car.image_path ? `<img src="${car.image_path}">` : `<div style="font-size:80px">🚗</div>`;
  return `
    <div class="car-card" onclick="openBooking(${car.id})">
      <div class="car-thumb">
        <span class="car-badge">${car.status}</span>
        ${thumb}
      </div>
      <div class="car-info">
        <div class="car-cat">${car.category}</div>
        <div class="car-name">${car.name}</div>
        <div class="car-meta">
          <span>⚙️ ${car.transmission}</span>
          <span>⛽ ${car.fuel_type}</span>
          <span>👤 ${car.seats} Seats</span>
        </div>
        <div class="car-price-row">
          <div class="car-price">NPR ${parseFloat(car.price_per_day).toLocaleString()} <span>/ day</span></div>
          <button class="btn-sm accent">Book Now</button>
        </div>
      </div>
    </div>
  `;
}

function openBooking(carId) {
  const car = CARS.find(c => c.id == carId);
  if (!car) return;
  showPage('booking');

  // Populate the select with cars if not already there, and select this one
  const select = document.getElementById('bk-car');
  select.innerHTML = CARS.map(c => `<option value="${c.id}" data-price="${c.price_per_day}">${c.name} — NPR ${parseFloat(c.price_per_day).toLocaleString()}/day</option>`).join('');
  select.value = car.id;
  updateOrderCard();
}

function updateOrderCard() {
  const select = document.getElementById('bk-car');
  const selectedOption = select.options[select.selectedIndex];
  if (!selectedOption) return;

  const rate = parseFloat(selectedOption.getAttribute('data-price')) || 0;
  const carName = selectedOption.text.split(' — ')[0];

  document.getElementById('order-car-name').textContent = carName;
  document.getElementById('order-rate').textContent = 'NPR ' + rate.toLocaleString();
  calcCost();
}

function calcCost() {
  const select = document.getElementById('bk-car');
  const selectedOption = select.options[select.selectedIndex];
  if (!selectedOption) return;

  const rate = parseFloat(selectedOption.getAttribute('data-price')) || 0;
  const p = document.getElementById('bk-pickup').value;
  const r = document.getElementById('bk-return').value;
  if (!p || !r || !rate) return;

  const days = Math.max(1, Math.ceil((new Date(r) - new Date(p)) / (1000 * 60 * 60 * 24)));
  document.getElementById('order-days').textContent = days + ' Days';

  let extras = 0;
  document.querySelectorAll('.filter-option input:checked').forEach(i => {
    if (i.parentElement.textContent.includes('GPS')) extras += 300;
    if (i.parentElement.textContent.includes('Child')) extras += 200;
    if (i.parentElement.textContent.includes('Additional')) extras += 500;
  });

  const total = (rate * days) + (extras * days);
  document.getElementById('order-extras').textContent = 'NPR ' + (extras * days).toLocaleString();
  document.getElementById('order-total').textContent = 'NPR ' + total.toLocaleString();
  return total;
}

async function confirmBooking() {
  const car_id = document.getElementById('bk-car').value;
  const pickup_location = document.getElementById('bk-pickup-location').value;
  const dropoff_location = document.getElementById('bk-dropoff-location').value;
  const pickup_date = document.getElementById('bk-pickup').value;
  const return_date = document.getElementById('bk-return').value;
  const first_name = document.getElementById('bk-firstname').value.trim();
  const last_name = document.getElementById('bk-lastname').value.trim();
  const email = document.getElementById('bk-email').value.trim();
  const phone = document.getElementById('bk-phone').value.trim();
  const license_no = document.getElementById('bk-license').value.trim();
  const license_expiry = document.getElementById('bk-license-expiry').value;
  const dob = document.getElementById('bk-dob').value;
  const total_price = calcCost();

  if (!car_id || car_id === '0') { showToast('Please select a vehicle', 'error'); return; }
  if (!pickup_location) { showToast('Please select a pick-up location', 'error'); return; }
  if (!dropoff_location) { showToast('Please select a drop-off location', 'error'); return; }
  if (!pickup_date) { showToast('Please select a pick-up date', 'error'); return; }
  if (!return_date) { showToast('Please select a return date', 'error'); return; }

  const todayStr = new Date().toISOString().split('T')[0];
  if (pickup_date < todayStr) { showToast('Pick-up date cannot be in the past', 'error'); return; }
  if (return_date < pickup_date) { showToast('Return date cannot be before pick-up date', 'error'); return; }

  if (!first_name) { showToast('Please enter your first name', 'error'); return; }
  if (!last_name) { showToast('Please enter your last name', 'error'); return; }
  if (!email) { showToast('Please enter your email address', 'error'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showToast('Please enter a valid email address', 'error'); return; }
  if (!phone) { showToast('Please enter your phone number', 'error'); return; }
  if (!dob) { showToast('Please enter your date of birth', 'error'); return; }
  if (getAge(dob) < 18) { showToast('The driver must be 18 years or older to book a car.', 'error'); return; }
  if (!license_no) { showToast('Please enter your driver\'s license number', 'error'); return; }
  if (!license_expiry) { showToast('Please select your license expiry date', 'error'); return; }
  if (license_expiry < todayStr) { showToast('Your driver\'s license has expired', 'error'); return; }

  const formData = new FormData();
  formData.append('car_id', car_id);
  formData.append('pickup_location', pickup_location);
  formData.append('dropoff_location', dropoff_location);
  formData.append('pickup_date', pickup_date);
  formData.append('return_date', return_date);
  formData.append('first_name', first_name);
  formData.append('last_name', last_name);
  formData.append('email', email);
  formData.append('phone', phone);
  formData.append('dob', dob);
  formData.append('license_no', license_no);
  formData.append('license_expiry', license_expiry);
  formData.append('total_price', total_price);

  try {
    const res = await fetch('backend/create_booking.php', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      if (data.user_name) {
        USER_SESSION.name = data.user_name;
        if (USER_SESSION.user) {
          USER_SESSION.user.first_name = first_name;
          USER_SESSION.user.last_name = last_name;
          USER_SESSION.user.email = email;
          USER_SESSION.user.phone = phone;
          USER_SESSION.user.dob = dob;
          USER_SESSION.user.license_no = license_no;
        }
        updateUIForAuth();
      }
      setTimeout(() => showPage('mybookings'), 800);
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Failed to connect to backend', 'error');
  }
}

async function renderMyBookings() {
  const container = document.getElementById('my-bookings-list');
  if (!container) return;

  try {
    const res = await fetch('backend/get_user_bookings.php');
    const data = await res.json();
    if (data.success) {
      if (data.bookings.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:40px; color:var(--gray-600);">No bookings found.</p>`;
        return;
      }
      container.innerHTML = data.bookings.map(b => `
        <div style="background:white; border:1px solid var(--gray-100); border-radius:var(--radius-lg); padding:24px; display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <div style="display:flex; gap:20px; align-items:center;">
            <div style="width:60px; height:60px; background:var(--gray-50); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:30px;">🚗</div>
            <div>
              <div style="font-weight:800; font-size:18px;">${b.car_name}</div>
              <div style="font-size:13px; color:var(--gray-600); margin-top:4px;">${b.pickup_date} — ${b.return_date} • NPR ${parseFloat(b.total_price).toLocaleString()}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <span style="background:#e1f5fe; color:#03a9f4; font-size:11px; font-weight:800; padding:4px 12px; border-radius:20px; text-transform:uppercase;">${b.status}</span>
            <div style="margin-top:8px; color:var(--primary); font-size:13px; font-weight:700; cursor:pointer;" onclick="showToast('Cancellation request sent','info')">Cancel Booking</div>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error("Failed to fetch user bookings", err);
  }
}

async function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const formData = new FormData();
  formData.append('email', email);
  formData.append('password', password);

  try {
    const res = await fetch('backend/auth_login.php', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      USER_SESSION = data;
      updateUIForAuth();
      setTimeout(() => showPage('home'), 600);
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Failed to connect to backend', 'error');
  }
}

async function handleLogout() {
  try {
    await fetch('backend/auth_logout.php');
    location.reload();
  } catch (err) {
    location.reload();
  }
}

function getAge(birthDateString) {
  if (!birthDateString) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

async function handleRegister() {
  const first_name = document.getElementById('reg-firstname').value;
  const last_name = document.getElementById('reg-lastname').value;
  const email = document.getElementById('reg-email').value;
  const phone = document.getElementById('reg-phone').value;
  const dob = document.getElementById('reg-dob').value;
  const license_no = document.getElementById('reg-license').value;
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;

  if (!first_name || !last_name || !email || !password || !dob) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  if (getAge(dob) < 18) {
    showToast('You must be 18 years or older to register.', 'error');
    return;
  }

  if (password.length < 6) {
    showToast('Password must be at least 6 characters.', 'error');
    return;
  }

  if (password !== confirm) {
    showToast('Passwords do not match', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('first_name', first_name);
  formData.append('last_name', last_name);
  formData.append('email', email);
  formData.append('phone', phone);
  formData.append('dob', dob);
  formData.append('license_no', license_no);
  formData.append('password', password);

  try {
    const res = await fetch('backend/auth_register.php', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      setTimeout(() => showPage('login'), 800);
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Failed to connect to backend', 'error');
  }
}

function updateUIForAuth() {
  if (USER_SESSION && USER_SESSION.success) {
    document.querySelector('.nav-actions').innerHTML = `
      <span style="font-size:14px; font-weight:600; color:var(--gray-600)">Hello, ${USER_SESSION.name}</span>
      <button class="btn-nav-book" onclick="handleLogout()">Logout</button>
    `;
    if (USER_SESSION.role === 'admin') {
      document.getElementById('nav-admin').style.display = 'block';
    } else {
      document.getElementById('nav-admin').style.display = 'none';
    }
  }
}

function prefillBookingForm() {
  if (USER_SESSION && USER_SESSION.user) {
    const u = USER_SESSION.user;
    const fn = document.getElementById('bk-firstname');
    const ln = document.getElementById('bk-lastname');
    const em = document.getElementById('bk-email');
    const ph = document.getElementById('bk-phone');
    const dob = document.getElementById('bk-dob');
    const lic = document.getElementById('bk-license');
    if (fn) fn.value = u.first_name || '';
    if (ln) ln.value = u.last_name || '';
    if (em) em.value = u.email || '';
    if (ph) ph.value = u.phone || '';
    if (dob) dob.value = u.dob || '';
    if (lic) lic.value = u.license_no || '';
  }
}

function switchAdmin(tab) {
  // Show correct content pane
  document.querySelectorAll('.admin-page').forEach(p => p.classList.remove('active'));
  document.getElementById('admin-' + tab).classList.add('active');

  // Highlight active sidebar link
  document.querySelectorAll('.admin-sidebar .sidebar-link').forEach(l => l.classList.remove('active'));
  const activeLink = document.getElementById('sb-' + tab);
  if (activeLink) activeLink.classList.add('active');

  if (tab === 'dashboard') updateAdminUI();
  if (tab === 'cars') renderAdminFleet();
  if (tab === 'bookings') renderAdminBookings();
  if (tab === 'customers') renderAdminCustomers();
}

async function updateAdminUI() {
  try {
    const res = await fetch('backend/admin_stats.php');
    const data = await res.json();
    if (data.success) {
      document.getElementById('stat-revenue').textContent = 'NPR ' + parseFloat(data.metrics.revenue).toLocaleString();
      document.getElementById('stat-bookings').textContent = data.metrics.active_bookings;
      document.getElementById('stat-fleet').textContent = data.metrics.fleet_avail + '/' + data.metrics.total_cars;
      document.getElementById('stat-customers').textContent = data.metrics.new_customers;

      // Update sidebar badges
      const carBadge = document.querySelector('#sb-cars .sidebar-badge');
      if (carBadge) carBadge.textContent = data.metrics.total_cars;

      const bookingBadge = document.querySelector('#sb-bookings .sidebar-badge');
      if (bookingBadge) bookingBadge.textContent = data.metrics.active_bookings;

      const recentTable = document.getElementById('recent-bookings-table');
      recentTable.innerHTML = data.recent_bookings.map(b => `
        <tr>
          <td style="font-weight:700;">#${b.id}</td>
          <td>${b.first_name} ${b.last_name}</td>
          <td>${b.car_name}</td>
          <td>${b.pickup_date}</td>
          <td>NPR ${parseFloat(b.total_price).toLocaleString()}</td>
          <td><span style="padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; background:var(--gray-100);">${b.status}</span></td>
        </tr>
      `).join('');
    } else if (data.unauthorized) {
      showToast(data.message, 'error');
      showPage('login');
    } else {
      showToast(data.message || 'Failed to fetch dashboard data', 'error');
    }
  } catch (err) {
    console.error('Failed to fetch admin stats', err);
    showToast('Dashboard data currently unavailable', 'info');
  }
  const todayEl = document.getElementById('today-date');
  if (todayEl) todayEl.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

async function renderAdminFleet() {
  const table = document.getElementById('admin-cars-table');
  if (!table) return;
  try {
    const res = await fetch('backend/admin_get_fleet.php');
    const data = await res.json();
    if (data.success) {
      const statusStyles = {
        available: { bg: '#e8f5e9', color: '#22c55e' },
        rented: { bg: '#fff3e0', color: '#f59e0b' },
        maintenance: { bg: '#ffebee', color: '#ef4444' }
      };
      table.innerHTML = data.cars.map(c => {
        const s = (c.status || 'available').toLowerCase();
        const sc = statusStyles[s] || { bg: '#f5f5f5', color: '#666' };
        const thumb = c.image_path
          ? `<img src="${c.image_path}" style="width:44px; height:44px; object-fit:cover; border-radius:8px;">`
          : `<div style="width:44px; height:44px; background:#f5f5f5; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:22px;">🚗</div>`;
        return `
        <tr>
          <td style="display:flex; align-items:center; gap:12px;">
            ${thumb}
            <div>
              <div style="font-weight:700; font-size:15px;">${c.name}</div>
              <div style="font-size:12px; color:#555;">${c.category}</div>
            </div>
          </td>
          <td><span style="font-size:13px; color:#222;">${c.transmission} · ${c.fuel_type} · ${c.seats} seats</span></td>
          <td style="font-weight:700;">NPR ${parseFloat(c.price_per_day).toLocaleString()}</td>
          <td>
            <select
              onchange="adminUpdateCarStatus(${c.id}, this.value, this)"
              style="padding:6px 12px; border-radius:20px; border:2px solid ${sc.bg}; background:${sc.bg}; color:${sc.color}; font-weight:700; font-size:12px; cursor:pointer; outline:none; font-family:inherit;">
              <option value="available"   ${s === 'available' ? 'selected' : ''}>available</option>
              <option value="rented"      ${s === 'rented' ? 'selected' : ''}>rented</option>
              <option value="maintenance" ${s === 'maintenance' ? 'selected' : ''}>maintenance</option>
            </select>
          </td>
          <td>
            <button class="btn-sm" style="background:#ffebee; color:#ef4444;" onclick="confirmDeleteCar(${c.id}, '${c.name.replace(/'/g, "\\'")}')">
              🗑 Delete
            </button>
          </td>
        </tr>`;
      }).join('');
    } else if (data.unauthorized) {
      showPage('login');
    }
  } catch (err) { console.error(err); }
}

async function adminUpdateCarStatus(carId, newStatus, selectEl) {
  const prevValue = selectEl.dataset.prev || selectEl.value;
  selectEl.dataset.prev = newStatus;

  const statusStyles = {
    available: { bg: '#e8f5e9', color: '#22c55e' },
    rented: { bg: '#fff3e0', color: '#f59e0b' },
    maintenance: { bg: '#ffebee', color: '#ef4444' }
  };
  const sc = statusStyles[newStatus] || { bg: '#f5f5f5', color: '#666' };
  // update select appearance immediately for snappy UX
  selectEl.style.background = sc.bg;
  selectEl.style.borderColor = sc.bg;
  selectEl.style.color = sc.color;

  const formData = new FormData();
  formData.append('car_id', carId);
  formData.append('status', newStatus);
  try {
    const res = await fetch('backend/admin_update_car_status.php', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      await fetchCars(); // keep public browse page in sync
      updateAdminUI();   // refresh dashboard metrics
    } else {
      showToast(data.message, 'error');
      // revert visual on failure
      selectEl.value = prevValue;
      const rc = statusStyles[prevValue] || { bg: '#f5f5f5', color: '#666' };
      selectEl.style.background = rc.bg;
      selectEl.style.borderColor = rc.bg;
      selectEl.style.color = rc.color;
    }
  } catch (err) {
    showToast('Status update failed.', 'error');
  }
}

async function renderAdminBookings() {
  const table = document.getElementById('admin-bookings-table');
  if (!table) return;
  try {
    const res = await fetch('backend/admin_get_bookings.php');
    const data = await res.json();
    if (data.success) {
      ADMIN_BOOKINGS = data.bookings;
      const statusColors = {
        pending: { bg: '#fff8e1', color: '#f59e0b' },
        confirmed: { bg: '#e8f5e9', color: '#22c55e' },
        completed: { bg: '#e3f2fd', color: '#3b82f6' },
        cancelled: { bg: '#ffebee', color: '#ef4444' }
      };
      table.innerHTML = data.bookings.map(b => {
        const s = (b.status || '').toLowerCase();
        const sc = statusColors[s] || { bg: '#f5f5f5', color: '#666' };
        return `
        <tr>
          <td style="font-weight:700;">#${b.id}</td>
          <td>${b.first_name} ${b.last_name}</td>
          <td>${b.car_name}</td>
          <td>${b.pickup_date}</td>
          <td>${b.return_date}</td>
          <td style="font-weight:700;">NPR ${parseFloat(b.total_price).toLocaleString()}</td>
          <td><span style="padding:4px 12px; border-radius:20px; font-size:11px; font-weight:700; background:${sc.bg}; color:${sc.color};">${b.status}</span></td>
          <td>
            <div style="display:flex; gap:8px;">
              <button class="btn-sm" style="background:#e3f2fd; color:#3b82f6; font-weight:700; cursor:pointer;" onclick="showBookingDetails(${b.id})">👁 View</button>
              ${s === 'pending' || s === 'confirmed' ? `
                ${s === 'pending' ? `<button class="btn-sm accent" style="font-weight:700; cursor:pointer;" onclick="adminUpdateBooking(${b.id}, 'confirmed')">✓ Confirm</button>` : ''}
                ${s === 'confirmed' ? `<button class="btn-sm" style="background:#e8f5e9; color:#22c55e; font-weight:700; cursor:pointer;" onclick="adminUpdateBooking(${b.id}, 'completed')">✓ Complete</button>` : ''}
                <button class="btn-sm" style="background:#ffebee; color:#f44336; font-weight:700; cursor:pointer;" onclick="confirmCancelBooking(${b.id})">✕ Cancel</button>
                <button class="btn-sm" style="background:#f5f5f5; color:#333; font-weight:700; cursor:pointer;" onclick="showEditBooking(${b.id})">✎ Edit</button>
              ` : ''}
            </div>
          </td>
        </tr>`;
      }).join('');
    } else if (data.unauthorized) {
      showPage('login');
    }
  } catch (err) { console.error(err); }
}

async function renderAdminCustomers() {
  const table = document.getElementById('admin-customers-table');
  if (!table) return;
  try {
    const res = await fetch('backend/admin_get_customers.php');
    const data = await res.json();
    if (data.success) {
      table.innerHTML = data.customers.map(c => `
        <tr>
          <td style="font-weight:700;">${c.first_name} ${c.last_name}</td>
          <td>${c.email}</td>
          <td>${c.phone}</td>
          <td>${c.license_no}</td>
          <td style="text-align:center;"><span style="background:var(--gray-50); padding:2px 8px; border-radius:10px; font-weight:700;">${c.booking_count}</span></td>
          <td><button class="btn-sm" onclick="showCustomerDetails(${c.id})">Details</button></td>
          <td><button class="btn-sm" style="background:#ffebee; color:#ef4444;" onclick="confirmDeleteUser(${c.id})">Delete</button></td>
        </tr>
      `).join('');
    } else if (data.unauthorized) {
      showPage('login');
    }
  } catch (err) { console.error(err); }
}

async function adminUpdateBooking(id, status) {
  const formData = new FormData();
  formData.append('booking_id', id);
  formData.append('status', status);
  try {
    const res = await fetch('backend/admin_manage_booking.php', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      renderAdminBookings();
      updateAdminUI(); // refresh metrics
    }
  } catch (err) { showToast('Update failed', 'error'); }
}

// ── DELETE VEHICLE MODAL ───────────────────────────────────────
function confirmDeleteCar(id, name) {
  const m = document.getElementById('modal-confirm-delete');
  m.querySelector('h3').textContent = `Delete "${name}"?`;
  m.querySelector('p').textContent = 'This will permanently remove the vehicle and all its bookings. This action cannot be undone.';
  m.style.display = 'flex';
  const btn = document.getElementById('confirm-delete-btn');
  btn.textContent = 'Delete';
  btn.style.background = '#ef4444';
  btn.onclick = () => adminDeleteCar(id);
}

async function adminDeleteCar(id) {
  const formData = new FormData();
  formData.append('car_id', id);
  try {
    const res = await fetch('backend/admin_delete_car.php', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeDeleteModal();
      await fetchCars();   // keep public browse page in sync
      renderAdminFleet();  // refresh fleet table
      updateAdminUI();     // refresh metrics
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) { showToast('Delete failed.', 'error'); }
}

// ── ADD VEHICLE MODAL ──────────────────────────────────────────
function showAddCarModal() {
  const m = document.getElementById('modal-add-car');
  m.style.display = 'flex';
  document.getElementById('add-car-form').reset();
}
function closeAddCarModal() {
  document.getElementById('modal-add-car').style.display = 'none';
}
async function submitAddCar(e) {
  e.preventDefault();
  const form = document.getElementById('add-car-form');
  const btn = form.querySelector('button[type=submit]');
  btn.textContent = 'Adding…'; btn.disabled = true;

  const formData = new FormData(form);
  const name = formData.get('name');
  if (!/^[A-Za-z\s]+$/.test(name)) {
    showToast('Vehicle name must only contain letters and spaces.', 'error');
    btn.textContent = 'Add Vehicle to Fleet'; btn.disabled = false;
    return;
  }
  try {
    const res = await fetch('backend/admin_add_car.php', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeAddCarModal();
      await fetchCars();        // refresh global CARS cache
      renderAdminFleet();       // refresh fleet table
      updateAdminUI();          // refresh metrics
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Failed to add vehicle.', 'error');
  } finally {
    btn.textContent = 'Add Vehicle to Fleet'; btn.disabled = false;
  }
}

// ── DELETE CUSTOMER MODAL ──────────────────────────────────────
let _pendingDeleteId = null;
function confirmDeleteUser(id) {
  _pendingDeleteId = id;
  const m = document.getElementById('modal-confirm-delete');
  m.style.display = 'flex';
  const btn = document.getElementById('confirm-delete-btn');
  btn.textContent = 'Delete';
  btn.style.background = '#ef4444';
  btn.onclick = () => adminDeleteUser(id);
}
function closeDeleteModal() {
  document.getElementById('modal-confirm-delete').style.display = 'none';
  _pendingDeleteId = null;
}
async function adminDeleteUser(id) {
  const formData = new FormData();
  formData.append('user_id', id);
  try {
    const res = await fetch('backend/admin_delete_user.php', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeDeleteModal();
      renderAdminCustomers();
      updateAdminUI();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) { showToast('Delete failed.', 'error'); }
}

// ── CUSTOMER DETAILS ───────────────────────────────────────────
async function showCustomerDetails(userId) {
  try {
    const res = await fetch('backend/admin_get_user_details.php?id=' + userId);
    const data = await res.json();
    if (data.success) {
      const c = data.customer;
      document.getElementById('det-name').textContent = `${c.first_name} ${c.last_name}`;
      document.getElementById('det-email').textContent = c.email;
      document.getElementById('det-phone').textContent = c.phone || 'N/A';
      document.getElementById('det-license').textContent = c.license_no || 'N/A';
      document.getElementById('det-dob').textContent = c.dob || 'N/A';
      document.getElementById('det-initials').textContent = c.first_name[0] + c.last_name[0];

      const list = document.getElementById('det-bookings-list');
      if (data.bookings.length === 0) {
        list.innerHTML = '<p style="color:#888; text-align:center; padding:20px;">No bookings found for this customer.</p>';
      } else {
        list.innerHTML = data.bookings.map(b => `
          <div style="background:#f9f9f9; padding:16px; border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-weight:700;">${b.car_name}</div>
              <div style="font-size:12px; color:#666;">${b.pickup_date} to ${b.return_date}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-weight:700;">NPR ${parseFloat(b.total_price).toLocaleString()}</div>
              <div style="font-size:11px; text-transform:uppercase; font-weight:800; color:var(--primary);">${b.status}</div>
            </div>
          </div>
        `).join('');
      }

      document.getElementById('modal-customer-details').style.display = 'flex';
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Failed to fetch user details', 'error');
  }
}

function closeCustomerModal() {
  document.getElementById('modal-customer-details').style.display = 'none';
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('success', 'error', 'info');
  t.classList.add(type);
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// Init
window.onload = async () => {
  await fetchCars();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  document.querySelectorAll('#pickup-date,#bk-pickup').forEach(el => el && (el.value = today));
  document.querySelectorAll('#return-date,#bk-return').forEach(el => el && (el.value = tomorrow));
  renderFeaturedCars();

  // Check if already logged in via session
  checkSession();
};

async function checkSession() {
  try {
    const res = await fetch('backend/check_auth.php');
    const data = await res.json();
    if (data.success) {
      USER_SESSION = {
        success: true,
        name: data.user.name,
        role: data.user.role,
        user: data.user
      };
      updateUIForAuth();
    }
  } catch (err) {
    console.error("Session check failed", err);
  }
}

// ── ADMIN BOOKING ACTIONS & MODALS ──────────────────────────────────────
function showBookingDetails(id) {
  const b = ADMIN_BOOKINGS.find(x => x.id == id);
  if (!b) return;

  document.getElementById('det-bk-id').textContent = '#' + b.id;
  document.getElementById('det-bk-custname').textContent = `${b.first_name} ${b.last_name}`;
  document.getElementById('det-bk-custemail').textContent = b.email;
  document.getElementById('det-bk-custphone').textContent = b.phone || 'N/A';
  document.getElementById('det-bk-custlicense').textContent = b.license_no || 'N/A';

  document.getElementById('det-bk-carname').textContent = b.car_name;
  document.getElementById('det-bk-carcat').textContent = b.car_category + ' · ' + (b.transmission || '') + ' · ' + (b.fuel_type || '');
  document.getElementById('det-bk-carspecs').textContent = `Daily Rate: NPR ${parseFloat(b.car_price).toLocaleString()} (seats: ${b.car_seats})`;

  document.getElementById('det-bk-pickup-date').textContent = b.pickup_date;
  document.getElementById('det-bk-return-date').textContent = b.return_date;
  
  // Duration calculation
  const p = new Date(b.pickup_date);
  const r = new Date(b.return_date);
  const days = Math.max(1, Math.ceil((r - p) / (1000 * 60 * 60 * 24)));
  document.getElementById('det-bk-duration').textContent = `Duration: ${days} day(s)`;

  document.getElementById('det-bk-pickuploc').textContent = b.pickup_location || 'Kathmandu Office';
  document.getElementById('det-bk-dropoffloc').textContent = b.dropoff_location || 'Same as Pick-up';

  const statusColors = {
    pending: { bg: '#fff8e1', color: '#f59e0b' },
    confirmed: { bg: '#e8f5e9', color: '#22c55e' },
    completed: { bg: '#e3f2fd', color: '#3b82f6' },
    cancelled: { bg: '#ffebee', color: '#ef4444' }
  };
  const s = (b.status || '').toLowerCase();
  const sc = statusColors[s] || { bg: '#f5f5f5', color: '#666' };
  
  const statusEl = document.getElementById('det-bk-status');
  statusEl.textContent = b.status;
  statusEl.style.background = sc.bg;
  statusEl.style.color = sc.color;

  document.getElementById('det-bk-price').textContent = 'NPR ' + parseFloat(b.total_price).toLocaleString();

  document.getElementById('modal-booking-details').style.display = 'flex';
}

function closeBookingDetailsModal() {
  document.getElementById('modal-booking-details').style.display = 'none';
}

function confirmCancelBooking(id) {
  const m = document.getElementById('modal-confirm-delete');
  m.querySelector('h3').textContent = `Cancel Booking #${id}?`;
  m.querySelector('p').textContent = 'Are you sure you want to cancel this booking? This will change its status to cancelled.';
  m.style.display = 'flex';
  
  const btn = m.querySelector('#confirm-delete-btn');
  btn.textContent = 'Cancel Booking';
  btn.style.background = '#ef4444';
  btn.onclick = () => adminCancelBooking(id);
}

async function adminCancelBooking(id) {
  closeDeleteModal();
  await adminUpdateBooking(id, 'cancelled');
}

function showEditBooking(id) {
  const b = ADMIN_BOOKINGS.find(x => x.id == id);
  if (!b) return;

  document.getElementById('edit-bk-id').value = b.id;
  document.getElementById('edit-bk-id-label').textContent = '#' + b.id;

  // Fill car dropdown
  const select = document.getElementById('edit-bk-car');
  select.innerHTML = CARS.map(c => `<option value="${c.id}" data-price="${c.price_per_day}">${c.name} — NPR ${parseFloat(c.price_per_day).toLocaleString()}/day</option>`).join('');
  select.value = b.car_id;
  select.onchange = calcEditCost;

  document.getElementById('edit-bk-pickuploc').value = b.pickup_location || 'Kathmandu Office';
  document.getElementById('edit-bk-dropoffloc').value = b.dropoff_location || 'Same as Pick-up';
  document.getElementById('edit-bk-pickup').value = b.pickup_date;
  document.getElementById('edit-bk-return').value = b.return_date;
  document.getElementById('edit-bk-price').value = Math.round(parseFloat(b.total_price));

  document.getElementById('modal-edit-booking').style.display = 'flex';
}

function closeEditBookingModal() {
  document.getElementById('modal-edit-booking').style.display = 'none';
}

function calcEditCost() {
  const select = document.getElementById('edit-bk-car');
  const selectedOption = select.options[select.selectedIndex];
  if (!selectedOption) return;

  const rate = parseFloat(selectedOption.getAttribute('data-price')) || 0;
  const p = document.getElementById('edit-bk-pickup').value;
  const r = document.getElementById('edit-bk-return').value;
  if (!p || !r || !rate) return;

  const days = Math.max(1, Math.ceil((new Date(r) - new Date(p)) / (1000 * 60 * 60 * 24)));
  const total = rate * days;
  document.getElementById('edit-bk-price').value = total;
}

async function submitEditBooking(e) {
  e.preventDefault();
  const booking_id = document.getElementById('edit-bk-id').value;
  const car_id = document.getElementById('edit-bk-car').value;
  const pickup_location = document.getElementById('edit-bk-pickuploc').value;
  const dropoff_location = document.getElementById('edit-bk-dropoffloc').value;
  const pickup_date = document.getElementById('edit-bk-pickup').value;
  const return_date = document.getElementById('edit-bk-return').value;
  const total_price = document.getElementById('edit-bk-price').value;

  const formData = new FormData();
  formData.append('booking_id', booking_id);
  formData.append('car_id', car_id);
  formData.append('pickup_location', pickup_location);
  formData.append('dropoff_location', dropoff_location);
  formData.append('pickup_date', pickup_date);
  formData.append('return_date', return_date);
  formData.append('total_price', total_price);

  try {
    const res = await fetch('backend/admin_edit_booking.php', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeEditBookingModal();
      renderAdminBookings();
      updateAdminUI();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Failed to update booking', 'error');
  }
}
