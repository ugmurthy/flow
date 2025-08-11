import React from 'react';
import Modal from './Modal';
import MarkdownRenderer from './MarkdownRenderer';

function ViewDataModal({ isOpen, onClose, data, title = "Node Data" }) {
  // Convert data to markdown format for display
  const formatDataAsMarkdown = (data) => {
    if (!data) return "No data available";
    
    if (typeof data === 'string') {
      return data;
    }
    
    if (typeof data === 'object') {
      let markdown = `# ${title}\n\n`;
      
      // Handle arrays
      if (Array.isArray(data)) {
        markdown += "## Data Items\n\n";
        data.forEach((item, index) => {
          markdown += `### Item ${index + 1}\n\n`;
          if (typeof item === 'object') {
            markdown += formatObjectAsMarkdown(item);
          } else {
            markdown += `${item}\n\n`;
          }
        });
      } else {
        // Handle objects
        markdown += formatObjectAsMarkdown(data);
      }
      
      return markdown;
    }
    
    return String(data);
  };
  
  const formatObjectAsMarkdown = (obj) => {
    let markdown = "";
    
    Object.entries(obj).forEach(([key, value]) => {
      markdown += `**${key}**: `;
      
      if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          markdown += "\n";
          value.forEach((item, index) => {
            markdown += `- ${typeof item === 'object' ? JSON.stringify(item, null, 2) : item}\n`;
          });
          markdown += "\n";
        } else {
          markdown += "\n```json\n" + JSON.stringify(value, null, 2) + "\n```\n\n";
        }
      } else {
        markdown += `${value}\n\n`;
      }
    });
    
    return markdown;
  };

  const markdownContent = formatDataAsMarkdown(data);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="max-w-4xl w-full">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        </div>
        
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50">
          <MarkdownRenderer
            content={markdownContent}
            width="100%"
            textColor="#374151"
            fontSize="14px"
          />
        </div>
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default ViewDataModal;