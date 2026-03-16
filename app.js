// ============================================================
// WARRIORBABE SALES OPS — APPLICATION LOGIC
// ============================================================

// ── NAVIGATION ──
function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(item.dataset.page);
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  document.querySelectorAll('.engine-card, .global-card').forEach(card => {
    card.addEventListener('click', () => {
      if (card.dataset.page) navigateTo(card.dataset.page);
    });
  });

  const hamburger = document.getElementById('hamburger');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }
}

function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');
  const navTarget = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (navTarget) navTarget.classList.add('active');
  window.scrollTo(0, 0);
}

// ── SOP TABS ──
function initSopTabs() {
  document.querySelectorAll('.sop-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = 'tab-' + tab.dataset.tab;
      // Find the parent page
      const page = tab.closest('.page');
      if (!page) return;
      // Deactivate all tabs in this page's tab group
      const tabGroup = tab.closest('.sop-tabs');
      tabGroup.querySelectorAll('.sop-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // Deactivate all sop-content in this page
      page.querySelectorAll('.sop-content').forEach(c => c.classList.remove('active'));
      // Activate the target
      const target = document.getElementById(tabId);
      if (target) target.classList.add('active');
    });
  });
}

// ── WORKFLOW CARD RENDERER ──
function renderWorkflowCard(wf) {
  const statusClass = wf.status === 'enabled' ? 'enabled' : 'disabled';
  const statusText = wf.status === 'enabled' ? '✅ Enabled' : '⏸ Disabled';
  const engineTag = `<span class="wf-engine-tag ${wf.engine}">${wf.engine.charAt(0).toUpperCase() + wf.engine.slice(1)}</span>`;

  const nodes = wf.nodes.map(n => `
    <div class="wf-node">
      <span class="wf-node-num">${n.num}</span>
      <div class="wf-node-content">
        <div class="wf-node-action">${n.action}</div>
        <div class="wf-node-detail">${n.detail}</div>
      </div>
      <span class="wf-node-type node-type-${n.type}">${n.type}</span>
    </div>
  `).join('');

  const hsUrl = wf.id ? WB.getWorkflowUrl(wf.id) : null;

  return `
    <div class="wf-card" data-engine="${wf.engine}" data-status="${wf.status}" id="wf-${wf.id}">
      <div class="wf-header" onclick="toggleWorkflow(this)">
        <span class="wf-status-dot ${statusClass}"></span>
        <span class="wf-name">${wf.name}</span>
        ${engineTag}
        <span class="wf-expand">▾</span>
      </div>
      <div class="wf-body">
        <div class="wf-meta">
          <div class="wf-meta-item">Status: <span>${statusText}</span></div>
          <div class="wf-meta-item">Object: <span>${wf.objectType}</span></div>
          <div class="wf-meta-item">Enrollment: <span>${wf.enrollmentType}</span></div>
          ${wf.id ? `<div class="wf-meta-item">ID: <span>${wf.id}</span></div>` : ''}
          ${hsUrl ? `<div class="wf-meta-item"><a href="${hsUrl}" target="_blank" rel="noopener" class="hs-link-btn">↗ Open in HubSpot</a></div>` : ''}
        </div>
        <div class="wf-desc">${wf.description}</div>
        ${wf.whyItMatters ? `<div class="callout callout-info"><strong>💡 Why It Matters:</strong> ${wf.whyItMatters}</div>` : ''}
        <div style="margin-top:20px">
          <div class="wf-nodes-title">Step-by-Step Nodes</div>
          <div class="wf-nodes">${nodes}</div>
        </div>
      </div>
    </div>
  `;
}

function toggleWorkflow(header) {
  header.closest('.wf-card').classList.toggle('open');
}

// ── ENGINE WORKFLOW RENDERERS ──
function renderSetterWorkflows() {
  const container = document.getElementById('setter-workflows');
  if (!container) return;
  container.innerHTML = WB.workflows.filter(w => w.engine === 'setter').map(renderWorkflowCard).join('');
}

function renderShowRateWorkflows() {
  const container = document.getElementById('showrate-workflows');
  if (!container) return;
  container.innerHTML = WB.workflows.filter(w => w.engine === 'showrate').map(renderWorkflowCard).join('');
}

function renderCloserWorkflows() {
  const container = document.getElementById('closer-workflows');
  if (!container) return;
  container.innerHTML = WB.workflows.filter(w => w.engine === 'closer').map(renderWorkflowCard).join('');
}

function renderGlobalWorkflows() {
  const container = document.getElementById('showrate-workflows-global');
  if (!container) return;
  container.innerHTML = WB.workflows.filter(w => w.engine === 'global').map(renderWorkflowCard).join('');
}

function renderAllWorkflows() {
  const container = document.getElementById('all-workflows-container');
  if (!container) return;
  container.innerHTML = WB.workflows.map(renderWorkflowCard).join('');
  initWorkflowFilters();
}

function initWorkflowFilters() {
  document.querySelectorAll('.wf-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wf-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterWorkflows();
    });
  });
  document.querySelectorAll('.wf-status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.wf-status-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterWorkflows();
    });
  });
}

function filterWorkflows() {
  const engineFilter = document.querySelector('.wf-filter.active')?.dataset.engine || 'all';
  const statusFilter = document.querySelector('.wf-status-btn.active')?.dataset.status || 'all';
  document.querySelectorAll('#all-workflows-container .wf-card').forEach(card => {
    const matchEngine = engineFilter === 'all' || card.dataset.engine === engineFilter;
    const matchStatus = statusFilter === 'all' || card.dataset.status === statusFilter;
    card.style.display = (matchEngine && matchStatus) ? 'block' : 'none';
  });
}

// ── PROPERTIES ──
function renderPropGroup(group) {
  const props = group.props.map(p => `
    <div class="prop-card">
      <div>
        <div class="prop-name">${p.name}</div>
        <div class="prop-type">${p.type}</div>
      </div>
      <div class="prop-def">${p.definition}</div>
      <div class="prop-trigger"><em>🤖 Triggers:</em> ${p.trigger}<br/><em>📊 Used for:</em> ${p.used}</div>
    </div>
  `).join('');
  return `
    <div class="prop-group">
      <div class="prop-group-title">${group.group}</div>
      ${props}
    </div>
  `;
}

function renderSetterProperties() {
  const container = document.getElementById('setter-properties');
  if (!container) return;
  const groups = WB.properties.contact.filter(g =>
    g.group.includes('Setter') || g.group.includes('Speed') || g.group.includes('Core')
  );
  container.innerHTML = `<div class="prop-table-wrap">${groups.map(renderPropGroup).join('')}</div>`;
}

function renderShowRateProperties() {
  const container = document.getElementById('showrate-properties');
  if (!container) return;
  container.innerHTML = `<div class="prop-table-wrap">${WB.properties.appointment.map(renderPropGroup).join('')}</div>`;
}

function renderCloserProperties() {
  const container = document.getElementById('closer-properties');
  if (!container) return;
  container.innerHTML = `<div class="prop-table-wrap">${WB.properties.deal.map(renderPropGroup).join('')}</div>`;
}

function renderAllProperties() {
  const container = document.getElementById('all-properties-container');
  if (!container) return;
  const sections = [
    { label: 'Contact Object', obj: 'contact', groups: WB.properties.contact },
    { label: 'Deal Object', obj: 'deal', groups: WB.properties.deal },
    { label: 'Appointment Object', obj: 'appointment', groups: WB.properties.appointment },
  ];
  container.innerHTML = sections.map(s => `
    <div class="prop-section" data-obj="${s.obj}">
      <div style="font-family:var(--font-head);font-size:22px;font-weight:800;margin:32px 0 16px;padding-bottom:12px;border-bottom:2px solid var(--border);">
        ${s.obj === 'contact' ? '👤' : s.obj === 'deal' ? '💼' : '📅'} ${s.label}
      </div>
      ${s.groups.map(renderPropGroup).join('')}
    </div>
  `).join('');
  initPropertyFilters();
  initPropertySearch();
}

function initPropertyFilters() {
  document.querySelectorAll('.prop-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.prop-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const obj = btn.dataset.obj;
      document.querySelectorAll('.prop-section').forEach(section => {
        section.style.display = (obj === 'all' || section.dataset.obj === obj) ? 'block' : 'none';
      });
    });
  });
}

function initPropertySearch() {
  const search = document.getElementById('propSearch');
  if (!search) return;
  search.addEventListener('input', () => {
    const q = search.value.toLowerCase();
    document.querySelectorAll('.prop-card').forEach(card => {
      card.style.display = card.textContent.toLowerCase().includes(q) ? 'grid' : 'none';
    });
    document.querySelectorAll('.prop-group').forEach(group => {
      const hasVisible = [...group.querySelectorAll('.prop-card')].some(c => c.style.display !== 'none');
      group.style.display = hasVisible ? 'block' : 'none';
    });
  });
}

// ── LEAD STATUS GRID ──
function renderLeadStatusGrid() {
  const colorMap = {
    green: 'badge-green', blue: 'badge-blue', amber: 'badge-amber',
    orange: 'badge-orange', red: 'badge-red', gray: 'badge-gray'
  };
  const html = WB.leadStatuses.map(ls => `
    <div class="ls-card">
      <div class="ls-status"><span class="${colorMap[ls.color] || 'badge-gray'}">${ls.status}</span></div>
      <div class="ls-def">${ls.def}</div>
    </div>
  `).join('');
  ['lead-status-grid', 'lead-status-grid-full'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  });
}

// ── DEAL PIPELINE (compact) ──
function renderDealPipeline() {
  const container = document.getElementById('deal-pipeline');
  if (!container) return;
  const p = WB.pipelines.deal;
  const totalStages = p.stages.reduce((acc, g) => acc + g.stages.length, 0);
  let stageNum = 0;

  container.innerHTML = `
    <div class="callout callout-info" style="margin-bottom:20px">
      <strong>📋 ${p.name}</strong> — ${totalStages} stages · Pipeline ID: ${p.id}
    </div>
    ${p.stages.map(group => `
      <div style="margin-bottom:20px">
        <div class="dp-group-title">${group.group}${group.groupNote ? `<span style="font-size:11px;font-weight:400;color:var(--red);margin-left:8px">${group.groupNote}</span>` : ''}</div>
        <div class="dp-stages">
          ${group.stages.map(s => {
            stageNum++;
            let typeClass = 'stage-manual';
            if (s.type === 'auto') typeClass = 'stage-auto';
            if (s.type === 'won') typeClass = 'stage-terminal-won';
            if (s.type === 'lost') typeClass = 'stage-terminal-lost';
            const badge = s.type === 'auto' ? '<span class="dp-stage-auto dp-auto">🤖 Auto only</span>' :
                          s.type === 'won' ? '<span class="dp-stage-auto dp-auto" style="color:var(--green)">🏆 Won</span>' :
                          s.type === 'lost' ? '<span class="dp-stage-auto dp-auto" style="color:var(--red)">🔚 Lost</span>' :
                          '<span class="dp-stage-auto dp-manual">✋ Manual</span>';
            const condHtml = s.conditionalOptions && s.conditionalOptions.length > 0 ? `
              <div style="margin-top:8px;padding:8px 10px;background:rgba(0,0,0,0.15);border-radius:6px;border-left:3px solid var(--amber)">
                <div style="font-size:11px;font-weight:700;color:var(--amber);margin-bottom:4px">📋 REQUIRED FIELDS:</div>
                ${s.conditionalOptions.map(opt => `<div style="font-size:11px;color:var(--text2);padding:2px 0">• ${opt}</div>`).join('')}
              </div>` : '';
            return `
              <div class="dp-stage ${typeClass}">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span style="background:var(--bg2);border:1px solid var(--border);border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;flex-shrink:0">${stageNum}</span>
                  <div class="dp-stage-name">${s.name}</div>
                  ${s.probability ? `<span style="margin-left:auto;font-size:11px;color:var(--text3)">~${s.probability}</span>` : ''}
                </div>
                <div class="dp-stage-desc">${s.desc}</div>
                ${badge}
                ${condHtml}
                ${s.triggers ? `<div style="font-size:11px;color:var(--amber);margin-top:6px;line-height:1.5">⚡ ${s.triggers}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('')}
  `;
}

// ── CONFIRMATION PIPELINE (SRE tab) ──
function renderConfirmationPipeline() {
  const container = document.getElementById('sre-confirmation-pipeline');
  if (!container) return;
  const p = WB.pipelines.appointment;

  container.innerHTML = `
    <div class="callout callout-info" style="margin-bottom:20px">
      <strong>📋 ${p.name}</strong> (ID: ${p.id}) — ${p.description}
    </div>
    ${p.stages.map(group => `
      <div style="margin-bottom:24px">
        <div class="dp-group-title">${group.group}${group.groupNote ? `<span style="font-size:11px;font-weight:400;color:var(--red);margin-left:8px">${group.groupNote}</span>` : ''}</div>
        <div class="conf-pipeline">
          ${group.stages.map(s => {
            let borderColor = 'var(--amber)';
            if (s.status === 'Closed') borderColor = 'var(--text3)';
            const statusBadge = `<span class="${s.status === 'Open' ? 'badge-green' : 'badge-gray'}" style="font-size:10px">${s.status || 'Open'}</span>`;
            const condHtml = s.conditionalOptions && s.conditionalOptions.length > 0 ? `
              <div style="margin-top:8px;padding:8px 10px;background:rgba(0,0,0,0.15);border-radius:6px;border-left:3px solid var(--amber)">
                <div style="font-size:11px;font-weight:700;color:var(--amber);margin-bottom:4px">📋 HOW TO MOVE:</div>
                ${s.conditionalOptions.map(opt => `<div style="font-size:11px;color:var(--text2);padding:2px 0">• ${opt}</div>`).join('')}
              </div>` : '';
            return `
              <div class="conf-stage" style="border-left-color:${borderColor}">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
                  <div class="conf-stage-name">${s.name}</div>
                  ${statusBadge}
                  ${s.id ? `<span style="font-size:10px;color:var(--text3);font-family:var(--font-mono)">ID: ${s.id}</span>` : ''}
                  <span class="dp-stage-auto dp-auto" style="font-size:10px">🤖 Auto</span>
                </div>
                <div class="conf-stage-desc">${s.desc}</div>
                ${condHtml}
                ${s.triggers ? `<div style="font-size:11px;color:var(--amber);margin-top:6px;line-height:1.5">⚡ ${s.triggers}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `).join('')}
  `;
}

// ── FULL PIPELINES PAGE ──
function renderPipelinesPage() {
  const container = document.getElementById('pipelines-container');
  if (!container) return;

  const renderStageCard = (s, idx, isDeal) => {
    let borderColor = 'var(--border2)';
    if (s.type === 'auto') borderColor = 'var(--amber)';
    if (s.type === 'won') borderColor = 'var(--green)';
    if (s.type === 'lost') borderColor = 'var(--red)';

    const badge = s.type === 'auto' ? '<span class="badge-amber">🤖 Auto only</span>' :
                  s.type === 'won' ? '<span class="badge-green">🏆 Closed Won</span>' :
                  s.type === 'lost' ? '<span class="badge-red">🔚 Lost/DQ</span>' :
                  '<span class="badge-gray">✋ Manual move</span>';
    const statusBadge = s.status ? `<span class="${s.status === 'Open' ? 'badge-green' : 'badge-gray'}" style="margin-left:4px">${s.status}</span>` : '';
    const hasConditionals = s.conditionalOptions && s.conditionalOptions.length > 0;

    return `
      <div style="background:var(--bg3);border:1px solid var(--border);border-left:4px solid ${borderColor};border-radius:12px;padding:20px 24px;margin-bottom:12px">
        <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">
          <div style="min-width:180px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
              ${idx !== null ? `<span style="background:var(--bg2);border:1px solid var(--border2);border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;color:var(--text1)">${idx}</span>` : ''}
              <div style="font-weight:800;font-size:15px;line-height:1.3">${s.name}</div>
            </div>
            ${s.id ? `<div style="font-size:11px;color:var(--text3);margin-bottom:6px;font-family:monospace">ID: ${s.id}</div>` : ''}
            ${s.probability ? `<div style="font-size:12px;color:var(--text2);margin-bottom:6px">Probability: <strong>${s.probability}</strong></div>` : ''}
            <div style="display:flex;gap:4px;flex-wrap:wrap">${badge}${statusBadge}</div>
          </div>
          <div style="flex:1;min-width:220px">
            <div style="font-size:13px;color:var(--text1);line-height:1.7;margin-bottom:10px">${s.desc}</div>
            ${s.moveRule ? `<div style="font-size:12px;color:var(--text3);font-style:italic;margin-bottom:10px">👤 <strong>When to use:</strong> ${s.moveRule}</div>` : ''}
            ${s.triggers ? `<div style="font-size:12px;color:var(--amber);line-height:1.6">⚡ <strong>What it triggers:</strong> ${s.triggers}</div>` : ''}
          </div>
          ${hasConditionals ? `
          <div style="min-width:260px;max-width:340px">
            <div style="background:rgba(255,165,0,0.08);border:1px solid rgba(255,165,0,0.3);border-radius:8px;padding:14px">
              <div style="font-size:12px;font-weight:800;color:var(--amber);margin-bottom:10px;text-transform:uppercase;letter-spacing:0.5px">📋 Conditional Stage Properties</div>
              <div style="font-size:12px;color:var(--text2);margin-bottom:8px;font-style:italic">${s.conditional}</div>
              <div style="display:flex;flex-direction:column;gap:4px">
                ${s.conditionalOptions.map(opt => `
                  <div style="display:flex;align-items:flex-start;gap:6px;font-size:12px;color:var(--text1);padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
                    <span style="color:var(--amber);flex-shrink:0;margin-top:2px">›</span>
                    <span>${opt}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>` : ''}
        </div>
      </div>
    `;
  };

  const renderPipelineSection = (pipeline) => {
    const totalStages = pipeline.stages.reduce((acc, g) => acc + g.stages.length, 0);
    let stageNum = 0;
    const isDeal = pipeline.object === 'Deal';

    return `
      <div class="pipeline-container-section">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">
          <h3 style="margin:0">${pipeline.name}</h3>
          <span class="badge-gray">${pipeline.object} Object</span>
          <span style="font-size:12px;color:var(--text3);font-family:monospace">ID: ${pipeline.id || 'N/A'}</span>
          <span style="font-size:12px;color:var(--text3)">${totalStages} stages</span>
        </div>
        <p style="font-size:13px;color:var(--text2);margin-bottom:20px;line-height:1.7">${pipeline.description}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px;padding:12px 16px;background:var(--bg3);border:1px solid var(--border);border-radius:10px">
          <div style="display:flex;align-items:center;gap:6px"><span class="badge-amber">🤖</span><span style="font-size:12px;color:var(--text2)">Auto — workflow/scheduling link sets this</span></div>
          <div style="display:flex;align-items:center;gap:6px"><span class="badge-gray">✋</span><span style="font-size:12px;color:var(--text2)">Manual — rep moves</span></div>
          <div style="display:flex;align-items:center;gap:6px"><span class="badge-green">🏆</span><span style="font-size:12px;color:var(--text2)">Closed Won (100%)</span></div>
          <div style="display:flex;align-items:center;gap:6px"><span class="badge-red">🔚</span><span style="font-size:12px;color:var(--text2)">Lost/DQ (0%)</span></div>
          <div style="display:flex;align-items:center;gap:6px"><span style="background:rgba(255,165,0,0.15);border:1px solid rgba(255,165,0,0.4);border-radius:4px;padding:2px 8px;font-size:11px;color:var(--amber)">📋</span><span style="font-size:12px;color:var(--text2)">Orange box = required fields</span></div>
        </div>
        ${pipeline.stages.map(group => `
          <div style="margin-bottom:28px">
            <div class="dp-group-title" style="margin-bottom:12px">
              ${group.group}
              ${group.groupNote ? `<div style="font-size:12px;font-weight:400;color:var(--red);margin-top:3px">${group.groupNote}</div>` : ''}
            </div>
            ${group.stages.map(s => {
              stageNum++;
              return renderStageCard(s, isDeal ? stageNum : null, isDeal);
            }).join('')}
          </div>
        `).join('')}
      </div>
    `;
  };

  container.innerHTML = `
    ${renderPipelineSection(WB.pipelines.deal)}
    <hr style="border:none;border-top:2px solid var(--border);margin:48px 0"/>
    ${renderPipelineSection(WB.pipelines.appointment)}
  `;
}

// ── LISTS PAGE ──
function renderListsPage() {
  const container = document.getElementById('lists-container');
  if (!container) return;
  const staticLists = WB.lists.filter(l => l.type === 'static');
  const activeLists = WB.lists.filter(l => l.type === 'active');

  const renderListCard = (l) => `
    <div class="list-card">
      <div class="list-type ${l.type}">${l.type === 'static' ? '📌 Static List' : '🔄 Active List / Smart View'}</div>
      <div class="list-name">${l.name}${l.id ? ` <span style="font-size:11px;color:var(--text3)">(ID: ${l.id})</span>` : ''}</div>
      <div class="list-desc">${l.desc}</div>
    </div>
  `;

  container.innerHTML = `
    <div class="lists-section">
      <h3>📌 Static Lists</h3>
      <div class="list-cards">${staticLists.map(renderListCard).join('')}</div>
    </div>
    <div class="lists-section">
      <h3>🔄 Active Lists & Smart Views</h3>
      <div class="list-cards">${activeLists.map(renderListCard).join('')}</div>
    </div>
    <div class="callout callout-info" style="margin-top:24px">
      <strong>📁 Organization Rule:</strong> Lists are organized into folders in HubSpot — one folder per funnel. Each funnel folder contains its own VSL/Quiz/Application lists so reporting stays clean and separated. Show Rate Engine lists (2379, 2380, 2381, 2382, 2392) are in their own folder.
    </div>
  `;
}

// ── QUICK LINKS PAGE ──
function renderQuickLinksPage() {
  const container = document.getElementById('quicklinks-container');
  if (!container) return;

  // ── Smart Views section ──
  const svSection = WB.smartViews.map(cat => `
    <div class="ql-group">
      <div class="ql-group-label">
        ${cat.category === 'contact' ? '👤 Contact Object' : '💼 Deal Object'}
        <span class="ql-obj-badge ${cat.category}">${cat.categoryLabel}</span>
      </div>
      <div class="ql-cards">
        ${cat.items.map(item => `
          <div class="ql-card">
            <div class="ql-card-top">
              <div class="ql-card-name">${item.name}</div>
              <a href="${item.url}" target="_blank" rel="noopener" class="ql-open-btn">↗ Open</a>
            </div>
            <div class="ql-card-desc">${item.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  // ── Dashboards section ──
  const dbSection = `
    <div class="ql-group">
      <div class="ql-group-label">📊 Dashboards</div>
      <div class="ql-cards">
        ${WB.dashboards.map(d => `
          <div class="ql-card ql-card-dashboard">
            <div class="ql-card-top">
              <div class="ql-card-name">${d.name}</div>
              <a href="${d.url}" target="_blank" rel="noopener" class="ql-open-btn ql-btn-dashboard">↗ Open</a>
            </div>
            <div class="ql-card-desc">${d.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // ── Lead Scoring ──
  const lsSection = `
    <div class="ql-group">
      <div class="ql-group-label">🏆 Lead Scoring</div>
      <div class="ql-cards">
        ${WB.leadScoring.map(ls => `
          <div class="ql-card ql-card-score">
            <div class="ql-card-top">
              <div class="ql-card-name">${ls.name}</div>
              <a href="${ls.url}" target="_blank" rel="noopener" class="ql-open-btn ql-btn-score">↗ Open</a>
            </div>
            <div class="ql-card-desc">${ls.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // ── Segments ──
  const segSection = WB.segments.map(grp => `
    <div class="ql-group">
      <div class="ql-group-label">📋 ${grp.group}</div>
      <div class="ql-cards">
        ${grp.items.map(seg => `
          <div class="ql-card ql-card-segment">
            <div class="ql-card-top">
              <div class="ql-card-name">${seg.name}${seg.id ? `<span class="ql-seg-id">ID: ${seg.id}</span>` : ''}</div>
              <a href="${seg.url}" target="_blank" rel="noopener" class="ql-open-btn ql-btn-segment">↗ Open</a>
            </div>
            <div class="ql-card-desc">${seg.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="callout callout-info" style="margin-bottom:28px">
      <strong>🔗 All links open directly in HubSpot.</strong> Use the ↗ Open buttons to jump straight into the relevant view, dashboard, list, or workflow — no searching required. Workflow links are also available on each workflow card throughout this doc.
    </div>

    <h2 class="section-title" style="margin-bottom:4px">Smart Views</h2>
    <p style="color:var(--text2);font-size:13px;margin-bottom:20px">One-click access to your daily working views — P1 through P4, deal views, and the confirmation specialist view.</p>
    ${svSection}

    <h2 class="section-title" style="margin-bottom:4px;margin-top:40px">Dashboards</h2>
    <p style="color:var(--text2);font-size:13px;margin-bottom:20px">Performance reporting dashboards for each engine.</p>
    ${dbSection}

    <h2 class="section-title" style="margin-bottom:4px;margin-top:40px">Lead Scoring</h2>
    <p style="color:var(--text2);font-size:13px;margin-bottom:20px">The score that drives P1–P4 Smart View sort order.</p>
    ${lsSection}

    <h2 class="section-title" style="margin-bottom:4px;margin-top:40px">Segments & Lists</h2>
    <p style="color:var(--text2);font-size:13px;margin-bottom:20px">Active segments and static lists used across all engines. Click to open in HubSpot and inspect filters.</p>
    ${segSection}
  `;
}

// ── SLACK PAGE ──
function renderSlackPage() {
  const container = document.getElementById('slack-container');
  if (!container) return;
  container.innerHTML = `
    <div class="slack-channels">
      ${WB.slack.map(ch => `
        <div class="slack-channel">
          <div class="slack-ch-header">
            <span style="font-size:28px">${ch.emoji}</span>
            <div>
              <div class="slack-ch-name">${ch.channel}</div>
              <div style="font-size:12px;color:var(--text3);font-family:monospace">${ch.id}</div>
            </div>
            <span class="badge-green" style="margin-left:auto">Active</span>
          </div>
          <div class="slack-ch-desc">${ch.purpose}</div>
          <div style="font-size:12px;color:var(--text3);margin-bottom:12px">Workflow: ${ch.workflow}</div>
          <div class="wf-nodes-title">When Does It Fire?</div>
          <div class="slack-fires">
            ${ch.fires.map(f => `<div class="slack-fire-item">${f}</div>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="callout callout-warning" style="margin-top:32px">
      <strong>⚠️ Important:</strong> Never message leads directly from Slack. All Slack messages here are internal system alerts only. Use Aloware or HubSpot native for outbound contact.
    </div>
  `;
}

// ── INTEGRATIONS PAGE ──
function renderIntegrationsPage() {
  const container = document.getElementById('integrations-container');
  if (!container) return;
  const statusColor = { green: 'badge-green', orange: 'badge-orange', red: 'badge-red' };

  container.innerHTML = `
    <div class="integrations-grid">
      ${WB.integrations.map(int => `
        <div class="int-card">
          <div class="int-icon">${int.icon}</div>
          <div class="int-name">${int.name}</div>
          <div class="int-status"><span class="${statusColor[int.statusColor] || 'badge-gray'}">● ${int.status}</span></div>
          <div class="int-desc">${int.description}</div>
          <div class="int-details">
            ${int.details.map(d => `<div class="int-detail">${d}</div>`).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="callout callout-info" style="margin-top:8px">
      <strong>🔐 Secrets Management:</strong> All API keys and tokens are stored as HubSpot Secrets (Settings → Integrations → Private Apps → Secrets). Never hardcode credentials in workflow custom code. Current secrets: <code>Fluffy_Timezone</code>, <code>access_token</code>, <code>clearoutphone</code>, <code>Calendly_Token</code>.
    </div>
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;margin-top:24px">
      <div style="font-family:var(--font-head);font-size:20px;font-weight:700;margin-bottom:16px;letter-spacing:1px">🔄 How a Booking Flows Through All Integrations</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${[
          { step: '1', label: 'Lead books via Calendly', detail: 'Clicks a Calendly scheduling link. Picks a time slot with a rep.' },
          { step: '2', label: 'Calendly fires webhook', detail: 'Calendly sends an invitee.created event to Zapier.' },
          { step: '3', label: 'Zapier writes to HubSpot', detail: 'Zapier searches for the contact by email, writes calendly_scheduled_event_uri and calendly_event_type_uri to the Contact.' },
          { step: '4', label: 'Error Handler safety check (3 min)', detail: 'If Zapier failed, the Calendly Error Handler calls the Calendly API directly to retrieve the URIs.' },
          { step: '5', label: 'Calendly Integration workflow fires', detail: 'Deduplicates meetings, fetches event details, parses meeting type and booking method, writes to Contact and Meeting record.' },
          { step: '6', label: 'Big Brain fires', detail: 'Reads the URI, identifies meeting type, creates Appointment record, moves deal stage, writes Zoom link and datetimes.' },
          { step: '7', label: 'ClearoutPhone validates number', detail: 'API call validates the lead phone number within the Big Brain workflow.' },
          { step: '8', label: 'Slack alert fires', detail: 'Full booking details posted to #confirmation-channel. Team claims confirmation.' },
          { step: '9', label: 'n8n receives webhook', detail: 'Ad attribution and downstream tracking fire via n8n webhook.' },
          { step: '10', label: 'Aloware used for dialing', detail: 'Setter dials the lead from Aloware. Call logged, Universal Call Tracker increments count.' },
        ].map(s => `
          <div style="display:flex;gap:12px;align-items:flex-start">
            <div style="width:28px;height:28px;background:var(--amber);color:var(--bg);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0">${s.step}</div>
            <div>
              <div style="font-weight:600;font-size:14px">${s.label}</div>
              <div style="font-size:13px;color:var(--text2)">${s.detail}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ── INIT ALL ──
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initSopTabs();

  // Setter page
  renderSetterWorkflows();
  renderSetterProperties();
  renderLeadStatusGrid();

  // Show Rate page
  renderShowRateWorkflows();
  renderShowRateProperties();
  renderConfirmationPipeline();

  // Closer page
  renderCloserWorkflows();
  renderCloserProperties();
  renderDealPipeline();

  // Global page
  renderGlobalWorkflows();

  // All Workflows page
  renderAllWorkflows();

  // All Properties page
  renderAllProperties();

  // Pipelines page
  renderPipelinesPage();

  // Lists page
  renderListsPage();

  // Quick Links page
  renderQuickLinksPage();

  // Slack page
  renderSlackPage();

  // Integrations page
  renderIntegrationsPage();
});