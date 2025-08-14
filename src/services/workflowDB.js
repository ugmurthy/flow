/**
 * IndexedDB service for workflow persistence
 * Handles all database operations for saving and loading workflows
 */

const DB_NAME = 'WorkflowDB';
const DB_VERSION = 1;
const STORE_NAME = 'workflows';

class WorkflowDB {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize the IndexedDB database
   * @returns {Promise<IDBDatabase>}
   */
  async init() {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create workflows object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          
          // Create indexes for efficient querying
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };
    });
  }

  /**
   * Save a workflow to the database
   * @param {Object} workflow - The workflow object to save
   * @returns {Promise<string>} - The workflow ID
   */
  async saveWorkflow(workflow) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.put(workflow);
      
      request.onsuccess = () => {
        resolve(workflow.id);
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to save workflow: ${request.error}`));
      };
    });
  }

  /**
   * Load a workflow by ID
   * @param {string} id - The workflow ID
   * @returns {Promise<Object|null>} - The workflow object or null if not found
   */
  async loadWorkflow(id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.get(id);
      
      request.onsuccess = () => {
        resolve(request.result || null);
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to load workflow: ${request.error}`));
      };
    });
  }

  /**
   * Get all workflows
   * @returns {Promise<Array>} - Array of all workflows
   */
  async getAllWorkflows() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.getAll();
      
      request.onsuccess = () => {
        // Sort by updatedAt descending (most recent first)
        const workflows = request.result.sort((a, b) => 
          new Date(b.updatedAt) - new Date(a.updatedAt)
        );
        resolve(workflows);
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to get workflows: ${request.error}`));
      };
    });
  }

  /**
   * Delete a workflow by ID
   * @param {string} id - The workflow ID
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  async deleteWorkflow(id) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to delete workflow: ${request.error}`));
      };
    });
  }

  /**
   * Search workflows by name
   * @param {string} searchTerm - The search term
   * @returns {Promise<Array>} - Array of matching workflows
   */
  async searchWorkflows(searchTerm) {
    const allWorkflows = await this.getAllWorkflows();
    
    if (!searchTerm || searchTerm.trim() === '') {
      return allWorkflows;
    }
    
    const term = searchTerm.toLowerCase().trim();
    return allWorkflows.filter(workflow => 
      workflow.name.toLowerCase().includes(term) ||
      (workflow.description && workflow.description.toLowerCase().includes(term))
    );
  }

  /**
   * Check if a workflow name already exists
   * @param {string} name - The workflow name to check
   * @param {string} excludeId - Optional ID to exclude from check (for updates)
   * @returns {Promise<boolean>} - True if name exists
   */
  async workflowNameExists(name, excludeId = null) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('name');
      
      const request = index.getAll(name);
      
      request.onsuccess = () => {
        const results = request.result;
        
        if (excludeId) {
          // Filter out the workflow being updated
          const filtered = results.filter(workflow => workflow.id !== excludeId);
          resolve(filtered.length > 0);
        } else {
          resolve(results.length > 0);
        }
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to check workflow name: ${request.error}`));
      };
    });
  }

  /**
   * Update an existing workflow
   * @param {string} id - The workflow ID
   * @param {Object} updates - The updates to apply
   * @returns {Promise<Object>} - The updated workflow
   */
  async updateWorkflow(id, updates) {
    const existingWorkflow = await this.loadWorkflow(id);
    
    if (!existingWorkflow) {
      throw new Error(`Workflow with ID ${id} not found`);
    }
    
    const updatedWorkflow = {
      ...existingWorkflow,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    await this.saveWorkflow(updatedWorkflow);
    return updatedWorkflow;
  }

  /**
   * Get database statistics
   * @returns {Promise<Object>} - Database statistics
   */
  async getStats() {
    const workflows = await this.getAllWorkflows();
    
    return {
      totalWorkflows: workflows.length,
      totalNodes: workflows.reduce((sum, w) => sum + (w.metadata?.nodeCount || 0), 0),
      totalEdges: workflows.reduce((sum, w) => sum + (w.metadata?.edgeCount || 0), 0),
      oldestWorkflow: workflows.length > 0 ? 
        workflows.reduce((oldest, w) => 
          new Date(w.createdAt) < new Date(oldest.createdAt) ? w : oldest
        ).createdAt : null,
      newestWorkflow: workflows.length > 0 ? workflows[0].updatedAt : null
    };
  }

  /**
   * Clear all workflows (use with caution)
   * @returns {Promise<boolean>}
   */
  async clearAllWorkflows() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const request = store.clear();
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = () => {
        reject(new Error(`Failed to clear workflows: ${request.error}`));
      };
    });
  }
}

// Create and export a singleton instance
const workflowDB = new WorkflowDB();
export default workflowDB;

// Export the class for testing purposes
export { WorkflowDB };