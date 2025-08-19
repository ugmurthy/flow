/**
 * ReactFlow Configuration Module
 * Centralized configuration for ReactFlow setup including node types, panels, and background
 */

import { BackgroundVariant } from '@xyflow/react';
import ProcessNew from '../components/ProcessNew.jsx';
import FetchNode from '../components/FetchNode.jsx';
import FetchNodeNew from '../components/FetchNodeNew.jsx';
//import FetchNodeNew from '../components/FetchNodeNewOptimized.jsx'
import MarkdownNode from '../components/MarkdownNode.jsx';
import MarkdownNew from '../components/MarkdownNew.jsx';
import TemplateFormNode from '../components/templateFormNode.jsx';
import { NODE_TYPES, APP_METADATA, PANEL_CONFIG, BACKGROUND_CONFIG } from './appConstants.js';

/**
 * ReactFlow node type mappings
 * Maps node type strings to their corresponding React components
 */
export const nodeTypes = {
  [NODE_TYPES.PROCESS_NEW]: ProcessNew,
  [NODE_TYPES.FETCH_NODE]: FetchNode,
  [NODE_TYPES.FETCH_NODE_NEW]: FetchNodeNew,
  [NODE_TYPES.MARKDOWN_NODE]: MarkdownNode,
  [NODE_TYPES.MARKDOWN_NEW]: MarkdownNew,
  [NODE_TYPES.TEMPLATE_FORM_NODE]: TemplateFormNode,
};

/**
 * ReactFlow default props configuration
 */
export const defaultReactFlowProps = {
  fitView: true,
  nodeTypes,
};

/**
 * Panel configurations for ReactFlow
 */
export const panelConfigurations = [
  {
    position: PANEL_CONFIG.title.position,
    className: PANEL_CONFIG.title.className,
    content: APP_METADATA.title
  },
  {
    position: PANEL_CONFIG.version.position,
    content: APP_METADATA.version
  },
  {
    position: PANEL_CONFIG.nodeTypes.position,
    className: PANEL_CONFIG.nodeTypes.className,
    content: (
      <div className='flex flex-col space-y-2 text-xs text-blue-900 font-thin'>
        <div>Input Nodes</div>
        <div>Process Nodes</div>
        <div>Output Nodes</div>
      </div>
    )
  }
];

/**
 * Background configurations for ReactFlow
 */
export const backgroundConfigurations = [
  {
    variant: BackgroundVariant[BACKGROUND_CONFIG.primary.variant],
    gap: BACKGROUND_CONFIG.primary.gap,
    color: BACKGROUND_CONFIG.primary.color,
    id: BACKGROUND_CONFIG.primary.id
  },
  {
    variant: BackgroundVariant[BACKGROUND_CONFIG.secondary.variant],
    gap: BACKGROUND_CONFIG.secondary.gap,
    color: BACKGROUND_CONFIG.secondary.color,
    id: BACKGROUND_CONFIG.secondary.id
  }
];

/**
 * Creates ReactFlow panel components
 * @returns {Array} Array of Panel JSX elements
 */
export const createPanels = () => {
  return panelConfigurations.map((config, index) => {
    const Panel = require('@xyflow/react').Panel;
    return (
      <Panel 
        key={index}
        position={config.position} 
        className={config.className}
      >
        {config.content}
      </Panel>
    );
  });
};

/**
 * Creates ReactFlow background components
 * @returns {Array} Array of Background JSX elements
 */
export const createBackgrounds = () => {
  return backgroundConfigurations.map((config, index) => {
    const Background = require('@xyflow/react').Background;
    return (
      <Background 
        key={index}
        variant={config.variant}
        gap={config.gap}
        color={config.color}
        id={config.id}
      />
    );
  });
};

/**
 * ReactFlow style configuration
 */
export const reactFlowStyle = {
  width: '100vw',
  height: '100vh'
};

/**
 * Default ReactFlow connection settings
 */
export const connectionSettings = {
  connectionMode: 'loose', // Allow loose connections
  snapToGrid: false,
  snapGrid: [15, 15],
  defaultEdgeOptions: {
    animated: false,
    style: { strokeWidth: 2 }
  }
};

/**
 * ReactFlow viewport settings
 */
export const viewportSettings = {
  defaultViewport: { x: 0, y: 0, zoom: 1 },
  minZoom: 0.1,
  maxZoom: 2,
  fitViewOptions: {
    padding: 0.1,
    includeHiddenNodes: false
  }
};

/**
 * Complete ReactFlow configuration object
 */
export const reactFlowConfig = {
  ...defaultReactFlowProps,
  ...connectionSettings,
  ...viewportSettings,
  style: reactFlowStyle
};

/**
 * Node drag and drop configuration
 */
export const dragDropConfig = {
  dragHandleSelector: '.drag-handle',
  nodesDraggable: true,
  nodesConnectable: true,
  elementsSelectable: true
};

/**
 * ReactFlow keyboard shortcuts configuration
 */
export const keyboardShortcuts = {
  deleteKey: ['Delete', 'Backspace'],
  multiSelectionKey: ['Meta', 'Ctrl'],
  zoomActivationKey: 'Meta',
  panActivationKey: 'Space'
};

/**
 * Creates a complete ReactFlow configuration with all settings
 * @param {Object} customConfig - Optional custom configuration overrides
 * @returns {Object} Complete ReactFlow configuration
 */
export const createReactFlowConfig = (customConfig = {}) => {
  return {
    ...reactFlowConfig,
    ...dragDropConfig,
    ...customConfig
  };
};

/**
 * Validates ReactFlow configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result
 */
export const validateReactFlowConfig = (config) => {
  const validation = {
    valid: true,
    errors: [],
    warnings: []
  };

  // Check required node types
  if (!config.nodeTypes || Object.keys(config.nodeTypes).length === 0) {
    validation.valid = false;
    validation.errors.push('No node types configured');
  }

  // Check for missing node type components
  Object.entries(config.nodeTypes || {}).forEach(([type, component]) => {
    if (!component) {
      validation.valid = false;
      validation.errors.push(`Node type '${type}' has no component`);
    }
  });

  // Validate viewport settings
  if (config.minZoom && config.maxZoom && config.minZoom >= config.maxZoom) {
    validation.warnings.push('minZoom should be less than maxZoom');
  }

  return validation;
};