/** Static UI only. Agent/project data is fetched after owner authentication. */
export const portfolioHtml=String.raw`
<style>
.bio-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.bio-section{margin:12px 0;padding:13px;background:#081a20;border:1px solid #406368;border-radius:12px}
.bio-section h3{color:#e0c88e;font-size:1rem;margin:0 0 7px}
.bio-section p{font-size:.9rem;line-height:1.6;margin:.3rem 0}
.bio-section ul{padding-left:21px;margin:7px 0}.bio-section li{margin:6px 0;font-size:.88rem}
.bio-meta{display:flex;gap:8px;flex-wrap:wrap;margin:7px 0}
.bio-tag{border:1px solid #51716f;color:#a5ded0;padding:3px 8px;border-radius:9px;font-size:.77rem}
#bio-details{min-height:80px}
</style>
<section id="agent-bios" class="panel" style="margin-top:18px" aria-label="Agent biographies and project assignments">
 <div class="eyebrow">SCOTTY / Agent Identity &amp; Project Intelligence</div>
 <h2>Agent Bio Studio</h2>
 <p class="muted">Choose an agent in the Specialist Mission Desk above. Open the full bio to see their expertise, assigned projects, question and mission history, recommended partners and verified past collaborators. All data stays in isolated Cloudflare D1.</p>
 <div class="buttons">
  <button type="button" id="bio-open" disabled>Open Selected Agent Bio</button>
  <button type="button" id="portfolio-refresh" class="secondary" disabled>Refresh Projects</button>
 </div>
 <p id="portfolio-status" class="note" role="status">Unlock the lab to load project teams.</p>
 <div id="bio-details" aria-live="polite"></div>
 <div class="bio-grid">
  <div class="bio-section">
   <h3>Project directory &amp; team recommendations</h3>
   <label for="portfolio-project">Project</label>
   <select id="portfolio-project" disabled><option>Unlock to load projects</option></select>
   <div class="buttons">
    <button type="button" id="portfolio-recommend" class="secondary" disabled>Recommend Project Team</button>
   </div>
   <div id="portfolio-teams" class="note">Recommendations are proposals, not assignments.</div>
  </div>
  <div class="bio-section">
   <h3>Log a real assignment</h3>
   <label for="portfolio-kind">Assignment type</label>
   <select id="portfolio-kind"><option value="project">Project</option><option value="question">Question</option><option value="mission">Mission</option></select>
   <label for="portfolio-title">Short, non-private assignment title</label>
   <input id="portfolio-title" maxlength="120" placeholder="For example: Review client portal navigation">
   <label class="check"><input type="checkbox" id="portfolio-approved">I approve this assignment, and its title contains no private, client, or production information.</label>
   <div class="buttons">
    <button type="button" id="portfolio-assign" disabled>Assign Selected Agent</button>
    <button type="button" id="portfolio-assign-team" class="secondary" disabled>Assign Suggested Team</button>
   </div>
   <p class="note">Questions and missions are recorded as assignments, not automatically executed. Completed live missions record actual participating agents separately.</p>
  </div>
  <div class="bio-section">
   <h3>Add another project</h3>
   <label for="portfolio-name">Project name</label><input id="portfolio-name" maxlength="90" placeholder="Project name">
   <label for="portfolio-category">Category</label><input id="portfolio-category" maxlength="50" placeholder="Writing, business, learning...">
   <label for="portfolio-focus">Focus for agent recommendations</label><textarea id="portfolio-focus" maxlength="160" placeholder="Broad skills required, without private documents"></textarea>
   <label class="check"><input type="checkbox" id="portfolio-create-approved">I approve storing these public or synthetic project labels in the isolated lab.</label>
   <div class="buttons"><button type="button" id="portfolio-create" disabled>Create Project</button></div>
  </div>
 </div>
</section>
`;
