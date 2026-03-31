class CicadaApp {
    constructor() {
        this.projects = [];
        this.tasks = [];
        this.tags = new Set();
        this.currentProject = null;
        this.currentFilter = 'all';
        this.currentTag = null;
        this.searchTerm = '';
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.render();
    }

    loadData() {
        // Load projects
        const savedProjects = localStorage.getItem('cicada-projects');
        if (savedProjects) {
            this.projects = JSON.parse(savedProjects);
        } else {
            // Create default project
            this.projects = [{
                id: Date.now(),
                name: 'Default Project',
                color: '#4f46e5',
                createdAt: new Date().toISOString()
            }];
        }

        // Load tasks
        const savedTasks = localStorage.getItem('cicada-tasks');
        if (savedTasks) {
            this.tasks = JSON.parse(savedTasks);
        }

        // Set current project (first one or last used)
        const lastProject = localStorage.getItem('cicada-last-project');
        this.currentProject = this.projects.find(p => p.id == lastProject) || this.projects[0];
        
        this.updateTags();
    }

    saveData() {
        localStorage.setItem('cicada-projects', JSON.stringify(this.projects));
        localStorage.setItem('cicada-tasks', JSON.stringify(this.tasks));
        if (this.currentProject) {
            localStorage.setItem('cicada-last-project', this.currentProject.id);
        }
        this.updateTags();
    }

    updateTags() {
        this.tags.clear();
        const projectTasks = this.getCurrentProjectTasks();
        projectTasks.forEach(task => {
            if (task.tags) {
                task.tags.forEach(tag => this.tags.add(tag));
            }
        });
    }

    getCurrentProjectTasks() {
        if (!this.currentProject) return [];
        return this.tasks.filter(t => t.projectId === this.currentProject.id);
    }

    setupEventListeners() {
        // Disabling Default ContextMenu
        addEventListener("contextmenu" ,(e)=>{
            e.preventDefault();
        });

        // Filter clicks
        $$('.filters li').forEach(item => {
            item.addEventListener('click', (e) => {
                $$('.filters li').forEach(li => li.classList.remove('active'));
                item.classList.add('active');
                this.currentFilter = item.dataset.filter;
                this.currentTag = null;
                this.updateCurrentViewTitle();
                this.render();
            });
        });

        // Add project button
        $('#add-project-btn').addEventListener('click', () => {
            this.showProjectModal();
        });

        // Add task button
        $('#add-task-btn').addEventListener('click', () => {
            if (!this.currentProject) {
                alert('Please select or create a project first');
                return;
            }
            $('#task-form-container').style.display = 'block';
            $('#task-title').focus();
        });

        // Cancel task button
        $('#cancel-task-btn').addEventListener('click', () => {
            $('#task-form-container').style.display = 'none';
            $('#task-form').reset();
        });

        // Task form submit
        $('#task-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTask();
        });

        // Search input
        $('#search-input').addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.render();
        });

        // Add tag button
        $('#add-tag-btn').addEventListener('click', () => {
            const tagName = prompt('Enter tag name:');
            if (tagName && tagName.trim()) {
                this.tags.add(tagName.trim());
                this.renderTags();
            }
        });

        // Project's ContextMenu Area
        // Hiding the menu
        $('#project-contextmenu-overlayer').addEventListener("click", (e)=>{
            if(e.target.id != "project-contextmenu-overlayer") return;
            e.target.style.display = "none";
        });

        $('#project-contextmenu-overlayer').addEventListener("contextmenu", (e)=>{
            if(e.target.id != "project-contextmenu-overlayer") return;
            e.target.style.display = "none";
        });

        // Edit Button
        $('#project-contextmenu-overlayer #edit-project').addEventListener("click", (e)=>{
            const projectId = parseInt($("#project-contextmenu-overlayer").getAttribute("projectId"));
            let project = this.projects.filter( p => p.id == projectId )[0];
            let newName = prompt("Enter a new name for (" + project.name + "):");
            project.name = newName;
            this.render();
            this.saveData();
            $('#project-contextmenu-overlayer').click();
        });    

        // Delete Button
        $('#project-contextmenu-overlayer #delete-project').addEventListener("click", (e)=>{
            const projectId = parseInt($("#project-contextmenu-overlayer").getAttribute("projectId"));
            this.deleteProject(projectId);
            $('#project-contextmenu-overlayer').click();
        });    

    }

    showProjectModal() {
        // Create modal if it doesn't exist
        let modal = $('#project-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'project-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Create New Project</h3>
                    <div class="form-group">
                        <label for="project-name">Project Name</label>
                        <input type="text" id="project-name" placeholder="e.g., Mobile App API">
                    </div>
                    <div class="form-group">
                        <label for="project-color">Color</label>
                        <input type="color" id="project-color" value="#4f46e5">
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" id="cancel-project-btn">Cancel</button>
                        <button class="btn btn-primary" id="save-project-btn">Create Project</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Add event listeners for modal
            $('#cancel-project-btn').addEventListener('click', () => {
                modal.classList.remove('active');
            });

            $('#save-project-btn').addEventListener('click', () => {
                const name = $('#project-name').value.trim();
                const color = $('#project-color').value;
                
                if (name) {
                    this.createProject(name, color);
                    modal.classList.remove('active');
                }
            });

            // Close modal when clicking outside
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        }

        modal.classList.add('active');
        $('#project-name').focus();
    }

    createProject(name, color) {
        const project = {
            id: Date.now(),
            name: name,
            color: color || '#4f46e5',
            createdAt: new Date().toISOString()
        };

        this.projects.push(project);
        this.currentProject = project;
        this.saveData();
        this.render();
    }

    deleteProject(projectId) {
        if (this.projects.length <= 1) {
            alert('Cannot delete the last project');
            return;
        }

        if (confirm('Are you sure you want to delete this project? All tasks will be moved to the default project.')) {
            const defaultProject = this.projects[0];
            
            // Move tasks to default project
            this.tasks.forEach(task => {
                if (task.projectId === projectId) {
                    task.projectId = defaultProject.id;
                }
            });

            // Remove project
            this.projects = this.projects.filter(p => p.id !== projectId);
            
            // Set current project to default if needed
            if (this.currentProject && this.currentProject.id === projectId) {
                this.currentProject = defaultProject;
            }

            this.saveData();
            this.render();
        }
    }

    switchProject(projectId) {
        const project = this.projects.find(p => p.id === projectId);
        if (project) {
            this.currentProject = project;
            this.currentTag = null;
            this.currentFilter = 'all';
            this.searchTerm = '';
            
            // Update UI
            $$('.filters li').forEach(li => li.classList.remove('active'));
            document.querySelector('[data-filter="all"]').classList.add('active');
            $('#search-input').value = '';
            
            this.updateTags();
            this.updateCurrentViewTitle();
            this.render();
            this.saveData();
        }
    }

    updateCurrentViewTitle() {
        const viewTitle = $('#current-view');
        if (this.currentProject) {
            let title = `${this.currentProject.name} / `;
            if (this.currentTag) {
                title += `Tag: ${this.currentTag}`;
            } else {
                title += this.currentFilter.charAt(0).toUpperCase() + this.currentFilter.slice(1);
            }
            viewTitle.textContent = title;
        }
    }

    createTask() {
        const title = $('#task-title').value;
        const description = $('#task-description').value;
        const priority = $('#task-priority').value;
        const estimate = $('#task-estimate').value;
        const tagsInput = $('#task-tags').value;

        const task = {
            id: Date.now(),
            projectId: this.currentProject.id,
            title,
            description,
            priority,
            estimate: parseFloat(estimate) || 0,
            completed: false,
            createdAt: new Date().toISOString(),
            tags: tagsInput ? tagsInput.split(',').map(t => t.trim()) : []
        };

        this.tasks.push(task);
        this.saveData();
        this.render();
        
        // Reset and hide form
        $('#task-form').reset();
        $('#task-form-container').style.display = 'none';
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveData();
            this.render();
        }
    }

    deleteTask(id) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== id);
            this.saveData();
            this.render();
        }
    }

    getFilteredTasks() {
        let filtered = this.getCurrentProjectTasks();

        // Apply status filter
        if (this.currentFilter === 'active') {
            filtered = filtered.filter(t => !t.completed);
        } else if (this.currentFilter === 'completed') {
            filtered = filtered.filter(t => t.completed);
        }

        // Apply tag filter
        if (this.currentTag) {
            filtered = filtered.filter(t => t.tags && t.tags.includes(this.currentTag));
        }

        // Apply search
        if (this.searchTerm) {
            filtered = filtered.filter(t => 
                t.title.toLowerCase().includes(this.searchTerm) ||
                (t.description && t.description.toLowerCase().includes(this.searchTerm)) ||
                (t.tags && t.tags.some(tag => tag.toLowerCase().includes(this.searchTerm)))
            );
        }

        return filtered;
    }

    render() {
        this.renderProjects();
        this.renderTasks();
        this.renderStats();
        this.renderTags();
    }

    renderProjects() {
        const projectsList = $('#projects-list');
        if (!projectsList) return;

        projectsList.innerHTML = this.projects.map(project => {
            const taskCount = this.tasks.filter(t => t.projectId === project.id).length;
            const isActive = this.currentProject && this.currentProject.id === project.id;
            
            return `
                <div class="project-item ${isActive ? 'active' : ''}" data-project-id="${project.id}">
                    <span class="project-name">
                        <i class="fas fa-folder" style="color: ${project.color}"></i>
                        ${this.escapeHtml(project.name)}
                    </span>
                    <span class="project-count">${taskCount}</span>
                </div>
            `;
        }).join('');

        // Add click handlers
        $$('.project-item').forEach(item => {
            item.addEventListener('click', () => {
                const projectId = parseInt(item.dataset.projectId);
                this.switchProject(projectId);
            });

            // // Add delete option (right-click or long press)
            // item.addEventListener('contextmenu', (e) => {
            //     e.preventDefault();
            //     const projectId = parseInt(item.dataset.projectId);
            //     this.deleteProject(projectId);
            // });
            

            //Display context menu 
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const overlayer = $('#project-contextmenu-overlayer');
                const menu = overlayer.querySelector("#project-contextmenu");
                menu.style.left = e.clientX + "px";
                menu.style.top = e.clientY + "px";
                overlayer.style.display = "block";
                overlayer.setAttribute("projectId", item.dataset.projectId);
            });

            //Double for Editing Project's name
            // item.addEventListener('contextmenu', (e) => {
            //     const projectId = parseInt(item.dataset.projectId);

            //     let newName = prompt("Rename (" + (this.projects.filter( p => p.id == projectId )[0].name) + "):");
            //     if(newName.length != 0){
            //         this.projects.filter( p => p.id == projectId )[0].name = newName;
            //     }
            //     this.render();
            //     this.saveData();
            // });

        });
    }

    renderTasks() {
        const tasksList = $('#tasks-list');
        const filteredTasks = this.getFilteredTasks();

        if (!this.currentProject) {
            tasksList.innerHTML = `
                <div class="no-tasks">
                    <i class="fas fa-folder-open"></i>
                    <h3>No Project Selected</h3>
                    <p>Select a project or create a new one to get started!</p>
                </div>
            `;
            return;
        }

        if (filteredTasks.length === 0) {
            tasksList.innerHTML = `
                <div class="no-tasks">
                    <i class="fas fa-tasks"></i>
                    <h3>No tasks found</h3>
                    <p>Create a new task in ${this.currentProject.name} to get started!</p>
                </div>
            `;
            return;
        }

        tasksList.innerHTML = filteredTasks.map(task => `
            <div class="task-card ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-header">
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <span class="task-title">${this.escapeHtml(task.title)}</span>
                    <span class="task-priority priority-${task.priority}">${task.priority}</span>
                    <i class="fas fa-trash delete-task"></i>
                </div>
                ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                <div class="task-footer">
                    <div class="task-tags">
                        ${task.tags ? task.tags.map(tag => 
                            `<span class="task-tag">${this.escapeHtml(tag)}</span>`
                        ).join('') : ''}
                    </div>
                    <div class="task-meta">
                        <span><i class="far fa-clock"></i> ${task.estimate}h</span>
                        <span><i class="far fa-calendar"></i> ${new Date(task.createdAt).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners to new tasks
        $$('.task-card').forEach(card => {
            const taskId = parseInt(card.dataset.taskId);
            
            card.querySelector('.task-checkbox').addEventListener('change', (e) => {
                e.stopPropagation();
                this.toggleTask(taskId);
            });

            card.querySelector('.delete-task').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteTask(taskId);
            });
        });
    }

    renderStats() {
        const projectTasks = this.getCurrentProjectTasks();
        const total = projectTasks.length;
        const completed = projectTasks.filter(t => t.completed).length;
        const active = total - completed;

        $('#all-count').textContent = total;
        $('#active-count').textContent = active;
        $('#completed-count').textContent = completed;

        const progress = total > 0 ? (completed / total) * 100 : 0;
        $('#progress-bar').style.width = `${progress}%`;
        $('#progress-text').textContent = `${completed}/${total} tasks completed`;
    }

    renderTags() {
        const tagsList = $('#tags-list');
        const tagsArray = Array.from(this.tags);

        if (tagsArray.length === 0) {
            tagsList.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px;">No tags in this project</p>';
            return;
        }

        const projectTasks = this.getCurrentProjectTasks();

        tagsList.innerHTML = tagsArray.map(tag => {
            const count = projectTasks.filter(t => t.tags && t.tags.includes(tag)).length;
            return `
                <div class="tag-item ${this.currentTag === tag ? 'active' : ''}" data-tag="${tag}">
                    <span><i class="fas fa-tag"></i> ${this.escapeHtml(tag)}</span>
                    <span class="count">${count}</span>
                </div>
            `;
        }).join('');

        // Add click handlers
        $$('.tag-item').forEach(item => {
            item.addEventListener('click', () => {
                const tag = item.dataset.tag;
                this.currentTag = this.currentTag === tag ? null : tag;
                this.currentFilter = 'all';
                
                $$('.filters li').forEach(li => li.classList.remove('active'));
                document.querySelector('[data-filter="all"]').classList.add('active');
                this.updateCurrentViewTitle();
                
                this.render();
            });
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    cicada = new CicadaApp();
});
