$(function () {
  // ---------- Helpers ----------
  const esc = (s) => $('<div>').text(s == null ? '' : String(s)).html();

  function toast(msg, isError) {
    $('#toast').text(msg).toggleClass('error', !!isError).addClass('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => $('#toast').removeClass('show'), 2600);
  }

  function ajaxError(xhr) {
    const errs = xhr.responseJSON && xhr.responseJSON.errors;
    return errs && errs.length ? errs : ['Something went wrong. Please try again.'];
  }

  const dateRange = (a, b) => (a || b ? esc(a || '') + ' — ' + esc(b || 'Present') : '');

  // ---------- Field + resource configuration ----------
  const profileFields = [
    { name: 'full_name', label: 'Full Name', required: true },
    { name: 'title', label: 'Professional Title', required: true, placeholder: 'e.g. Full Stack Developer' },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone' },
    { name: 'location', label: 'Location' },
    { name: 'about', label: 'About Me', type: 'textarea' },
    { name: 'github', label: 'GitHub URL', placeholder: 'https://github.com/username' },
    { name: 'linkedin', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/username' },
    { name: 'image', label: 'Profile Image', type: 'file' }
  ];

  const resources = {
    skills: {
      singular: 'Skill', list: '#skillsList',
      fields: [
        { name: 'name', label: 'Skill Name', required: true },
        { name: 'level', label: 'Proficiency (0-100)', type: 'number', required: true, value: 70 }
      ],
      render: (r) => `
        <div class="card" data-id="${r.id}">
          <div class="skill-top"><span>${esc(r.name)}</span><span>${esc(r.level)}%</span></div>
          <div class="bar"><span style="width:${Number(r.level) || 0}%"></span></div>
          ${actions()}
        </div>`
    },
    education: {
      singular: 'Education', list: '#educationList',
      fields: [
        { name: 'degree', label: 'Degree / Program', required: true },
        { name: 'institution', label: 'Institution', required: true },
        { name: 'start_year', label: 'Start Year' },
        { name: 'end_year', label: 'End Year', hint: 'Leave empty if ongoing' },
        { name: 'description', label: 'Description', type: 'textarea' }
      ],
      render: (r) => `
        <div class="card" data-id="${r.id}">
          <h4>${esc(r.degree)}</h4><div class="sub">${esc(r.institution)}</div>
          <div class="date">${dateRange(r.start_year, r.end_year)}</div>
          ${r.description ? `<p>${esc(r.description)}</p>` : ''}
          ${actions()}
        </div>`
    },
    experience: {
      singular: 'Experience', list: '#experienceList',
      fields: [
        { name: 'role', label: 'Role / Position', required: true },
        { name: 'company', label: 'Company', required: true },
        { name: 'start_date', label: 'Start Date', placeholder: 'e.g. Jun 2024' },
        { name: 'end_date', label: 'End Date', placeholder: 'Leave empty if current' },
        { name: 'description', label: 'Description', type: 'textarea' }
      ],
      render: (r) => `
        <div class="card" data-id="${r.id}">
          <h4>${esc(r.role)}</h4><div class="sub">${esc(r.company)}</div>
          <div class="date">${dateRange(r.start_date, r.end_date)}</div>
          ${r.description ? `<p>${esc(r.description)}</p>` : ''}
          ${actions()}
        </div>`
    },
    projects: {
      singular: 'Project', list: '#projectsList',
      fields: [
        { name: 'title', label: 'Project Title', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'tech', label: 'Technologies', placeholder: 'Node.js, MySQL, jQuery', hint: 'Comma separated' },
        { name: 'link', label: 'Project Link', placeholder: 'https://...' },
        { name: 'image', label: 'Project Image', type: 'file' }
      ],
      render: (r) => `
        <div class="card project-card" data-id="${r.id}">
          ${r.image ? `<img class="project-img" src="uploads/${esc(r.image)}" alt="${esc(r.title)}">` : '<div class="project-ph">&#128187;</div>'}
          <div class="project-body">
            <h4>${esc(r.title)}</h4>
            ${r.description ? `<p>${esc(r.description)}</p>` : ''}
            <div class="tags">${(r.tech || '').split(',').filter((t) => t.trim()).map((t) => `<span class="tag">${esc(t.trim())}</span>`).join('')}</div>
            <div class="card-actions">
              ${r.link ? `<a class="btn small outline" href="${esc(r.link)}" target="_blank" rel="noopener">View</a>` : ''}
              <button class="btn small ghost edit-btn">Edit</button>
              <button class="btn small danger delete-btn">Delete</button>
            </div>
          </div>
        </div>`
    }
  };

  function actions() {
    return `<div class="card-actions">
      <button class="btn small ghost edit-btn">Edit</button>
      <button class="btn small danger delete-btn">Delete</button></div>`;
  }

  const cache = { profile: null, skills: [], education: [], experience: [], projects: [] };

  // ---------- Loading (AJAX, no page reload) ----------
  function loadProfile() {
    return $.getJSON('/api/profile').done((p) => {
      cache.profile = p;
      renderProfile(p);
    }).fail(() => toast('Could not load profile', true));
  }

  function loadList(name) {
    const cfg = resources[name];
    return $.getJSON('/api/' + name).done((rows) => {
      cache[name] = rows;
      const $l = $(cfg.list).empty();
      if (!rows.length) $l.append(`<div class="empty">No ${name} yet. Click "+ Add" to create one.</div>`);
      rows.forEach((r) => $l.append(cfg.render(r)));
    }).fail(() => toast('Could not load ' + name, true));
  }

  function renderProfile(p) {
    const $h = $('#about');
    if (!p) {
      $('#brandName').text('Portfolio');
      $h.html(`<div class="setup-card">
        <h1>Welcome! &#128075;</h1>
        <p>Set up your portfolio by adding your personal information. You can edit everything later.</p>
        <button class="btn" id="setupBtn">Create My Profile</button></div>`);
      return;
    }
    $('#brandName').text(p.full_name);
    $('#footerText').html('&copy; ' + new Date().getFullYear() + ' ' + esc(p.full_name));
    const avatar = p.image
      ? `<img class="avatar" src="uploads/${esc(p.image)}" alt="${esc(p.full_name)}">`
      : `<div class="avatar avatar-ph">${esc(p.full_name.charAt(0).toUpperCase())}</div>`;
    $h.html(`<div class="hero-inner">
      ${avatar}
      <div class="hero-text">
        <h1>${esc(p.full_name)}</h1>
        <div class="role">${esc(p.title)}</div>
        ${p.about ? `<p class="about">${esc(p.about)}</p>` : ''}
        <div class="meta">
          <span>&#9993; ${esc(p.email)}</span>
          ${p.phone ? `<span>&#9742; ${esc(p.phone)}</span>` : ''}
          ${p.location ? `<span>&#128205; ${esc(p.location)}</span>` : ''}
        </div>
        <div class="hero-actions">
          ${p.github ? `<a class="btn outline small" href="${esc(p.github)}" target="_blank" rel="noopener">GitHub</a>` : ''}
          ${p.linkedin ? `<a class="btn outline small" href="${esc(p.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>` : ''}
          <button class="btn small" id="editProfileBtn">Edit Profile</button>
          ${p.image ? '<button class="btn small ghost" id="removeImgBtn">Remove Photo</button>' : ''}
        </div>
      </div></div>`);
  }

  // ---------- Reusable modal form ----------
  let current = null; // { type: 'profile' | resourceName, id, fields }

  function openModal(title, fields, data, ctx) {
    current = ctx;
    $('#modalTitle').text(title);
    $('#formErrors').prop('hidden', true).empty();
    const $f = $('#modalFields').empty();
    fields.forEach((f) => {
      const val = data && data[f.name] != null ? data[f.name] : (f.value != null ? f.value : '');
      let input;
      if (f.type === 'textarea') {
        input = `<textarea name="${f.name}">${esc(val)}</textarea>`;
      } else if (f.type === 'file') {
        input = `<input type="file" name="${f.name}" accept="image/*">` +
          (data && data[f.name] ? `<img class="preview" src="uploads/${esc(data[f.name])}" alt="current">` : '');
      } else {
        input = `<input type="${f.type || 'text'}" name="${f.name}" value="${esc(val)}" placeholder="${esc(f.placeholder || '')}"${f.type === 'number' ? ' min="0" max="100"' : ''}>`;
      }
      $f.append(`<div class="field"><label>${esc(f.label)}${f.required ? ' *' : ''}</label>${input}${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`);
    });
    $('#modal').addClass('open').attr('aria-hidden', 'false');
    $f.find('input,textarea').first().trigger('focus');
  }

  function closeModal() {
    $('#modal').removeClass('open').attr('aria-hidden', 'true');
    current = null;
  }

  function clientValidate(fields, fd) {
    const errors = [];
    fields.forEach((f) => {
      const v = (fd.get(f.name) || '').toString().trim();
      if (f.required && !v) errors.push(f.label + ' is required');
      if (f.name === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors.push('Enter a valid email address');
    });
    return errors;
  }

  $('#modalForm').on('submit', function (e) {
    e.preventDefault();
    if (!current) return;
    const fd = new FormData(this);
    const errors = clientValidate(current.fields, fd);
    if (errors.length) return showErrors(errors);

    const isProfile = current.type === 'profile';
    const url = isProfile ? '/api/profile' : '/api/' + current.type + (current.id ? '/' + current.id : '');
    const method = isProfile || !current.id ? 'POST' : 'PUT';
    const type = current.type;

    $.ajax({ url, method, data: fd, processData: false, contentType: false })
      .done((res) => {
        closeModal();
        toast(res.message || 'Saved');
        if (type === 'profile') loadProfile(); else loadList(type);
      })
      .fail((xhr) => showErrors(ajaxError(xhr)));
  });

  function showErrors(errs) {
    $('#formErrors').prop('hidden', false).html('<ul>' + errs.map((x) => `<li>${esc(x)}</li>`).join('') + '</ul>');
  }

  $('#modalClose, #modalCancel').on('click', closeModal);
  $('#modal').on('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  $(document).on('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // ---------- Event wiring (delegated, so it works on AJAX-rendered content) ----------
  $(document).on('click', '#setupBtn', () => openModal('Create Your Profile', profileFields, null, { type: 'profile', fields: profileFields }));
  $(document).on('click', '#editProfileBtn', () => openModal('Edit Profile', profileFields, cache.profile, { type: 'profile', fields: profileFields }));

  $(document).on('click', '#removeImgBtn', () => {
    if (!confirm('Remove your profile photo?')) return;
    $.ajax({ url: '/api/profile/image', method: 'DELETE' })
      .done(() => { toast('Photo removed'); loadProfile(); })
      .fail((xhr) => toast(ajaxError(xhr)[0], true));
  });

  $('.add-btn').on('click', function () {
    const name = $(this).data('res');
    const cfg = resources[name];
    if (!cache.profile) return toast('Please create your profile first', true);
    openModal('Add ' + cfg.singular, cfg.fields, null, { type: name, fields: cfg.fields });
  });

  function resourceOf($el) {
    const id = $el.closest('.list').attr('id').replace('List', '');
    return { name: id, id: $el.closest('[data-id]').data('id') };
  }

  $(document).on('click', '.edit-btn', function () {
    const { name, id } = resourceOf($(this));
    const cfg = resources[name];
    const row = cache[name].find((r) => r.id === id);
    openModal('Edit ' + cfg.singular, cfg.fields, row, { type: name, id, fields: cfg.fields });
  });

  $(document).on('click', '.delete-btn', function () {
    const { name, id } = resourceOf($(this));
    if (!confirm('Delete this ' + resources[name].singular.toLowerCase() + '?')) return;
    $.ajax({ url: '/api/' + name + '/' + id, method: 'DELETE' })
      .done((res) => { toast(res.message); loadList(name); })
      .fail((xhr) => toast(ajaxError(xhr)[0], true));
  });

  // Mobile menu
  $('#menuBtn').on('click', () => $('#nav').toggleClass('open'));
  $('#nav a').on('click', () => $('#nav').removeClass('open'));

  // ---------- Initial load ----------
  loadProfile();
  Object.keys(resources).forEach(loadList);
});
