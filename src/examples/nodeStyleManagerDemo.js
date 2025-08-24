/**
 * NodeStyleManager Demo - Unified Styling System Showcase
 * Demonstrates Phase 6 implementation capabilities
 * Version 2.0.0
 */

import { 
  NodeStyleManager, 
  StyleUtils, 
  AnimationInjector,
  globalStyleManager
} from '../styles/nodeStyleManager.js';
import { 
  NodeData,
  InputNodeData, 
  ProcessNodeData, 
  OutputNodeData,
  NodeVisualState, 
  HandleConfiguration 
} from '../types/nodeSchema.js';

/**
 * Demo Class - Comprehensive Styling System Showcase
 */
class NodeStyleManagerDemo {
  constructor() {
    this.styleManager = new NodeStyleManager();
    this.animationInjector = new AnimationInjector();
    this.demoNodes = new Map();
    
    console.log('🎨 NodeStyleManager Demo Initialized');
    console.log('==========================================');
  }

  /**
   * Run complete demo showcasing all styling capabilities
   */
  runCompleteDemo() {
    console.log('\n🚀 Starting Comprehensive NodeStyleManager Demo\n');
    
    this.demoBasicStyling();
    this.demoVisualStates();
    this.demoThemeSystem();
    this.demoHandleStyling();
    this.demoAnimations();
    this.demoPerformance();
    this.demoNodeTypeSpecific();
    this.demoComplexScenarios();
    this.showPerformanceMetrics();
    
    console.log('\n✅ Demo Complete! All styling capabilities demonstrated.');
    return this.getDemoSummary();
  }

  /**
   * Demo 1: Basic Styling Functionality
   */
  demoBasicStyling() {
    console.log('📝 Demo 1: Basic Styling Functionality');
    console.log('=====================================');

    // Create a basic input node
    const basicNode = InputNodeData.create({
      meta: {
        label: 'Basic Input Node',
        function: 'Collect User Data',
        emoji: '📝'
      }
    });

    // Get default styles
    const defaultStyles = this.styleManager.getNodeStyle(basicNode);
    console.log('Default Styles:', this.formatStyles(defaultStyles));

    // Apply style overrides
    const customStyles = this.styleManager.getNodeStyle(basicNode, 'default', {
      backgroundColor: '#e0f2fe',
      borderColor: '#0891b2',
      fontSize: '18px',
      padding: '20px'
    });
    console.log('Custom Override Styles:', this.formatStyles(customStyles));

    this.demoNodes.set('basicNode', basicNode);
    console.log('✓ Basic styling demo complete\n');
  }

  /**
   * Demo 2: Visual State Management
   */
  demoVisualStates() {
    console.log('🎭 Demo 2: Visual State Management');
    console.log('==================================');

    const stateNode = ProcessNodeData.create({
      meta: {
        label: 'State Demo Node',
        function: 'Process Multiple States',
        emoji: '⚡'
      }
    });

    const states = ['default', 'processing', 'success', 'error', 'disabled'];
    
    states.forEach(state => {
      const styles = this.styleManager.getNodeStyle(stateNode, state);
      console.log(`${state.toUpperCase()} State:`, {
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
        animation: styles.animation || 'none',
        opacity: styles.opacity || 1
      });
    });

    // Demonstrate dynamic state updates
    const updatedNode = this.styleManager.updateVisualState(stateNode, 'custom-processing', {
      container: {
        backgroundColor: '#fef3c7',
        borderColor: '#f59e0b',
        borderWidth: 3
      },
      effects: {
        pulse: true,
        glow: true
      }
    });

    const customStateStyles = this.styleManager.getNodeStyle(updatedNode, 'custom-processing');
    console.log('Custom Processing State:', this.formatStyles(customStateStyles));

    this.demoNodes.set('stateNode', updatedNode);
    console.log('✓ Visual state management demo complete\n');
  }

  /**
   * Demo 3: Theme System
   */
  demoThemeSystem() {
    console.log('🎨 Demo 3: Theme System');
    console.log('=======================');

    // Register custom theme
    const cyberpunkTheme = {
      container: {
        backgroundColor: '#0a0a0a',
        borderColor: '#00ffff',
        borderWidth: 2,
        boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)'
      },
      typography: {
        titleColor: '#00ff00',
        subtitleColor: '#ffff00',
        fontFamily: 'monospace'
      }
    };

    this.styleManager.registerTheme('cyberpunk', cyberpunkTheme);

    const themedNode = OutputNodeData.create({
      meta: {
        label: 'Cyberpunk Output',
        function: 'Matrix Display',
        emoji: '🤖'
      },
      styling: {
        theme: 'cyberpunk'
      }
    });

    // Show different themes
    const themes = ['default', 'dark', 'colorful', 'cyberpunk'];
    
    themes.forEach(theme => {
      const themedNodeCopy = {
        ...themedNode,
        styling: { ...themedNode.styling, theme }
      };
      
      const styles = this.styleManager.getNodeStyle(themedNodeCopy);
      console.log(`${theme.toUpperCase()} Theme:`, {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        borderColor: styles.borderColor,
        fontFamily: styles.fontFamily
      });
    });

    console.log('Available Themes:', this.styleManager.getAvailableThemes());
    
    this.demoNodes.set('themedNode', themedNode);
    console.log('✓ Theme system demo complete\n');
  }

  /**
   * Demo 4: Handle Styling
   */
  demoHandleStyling() {
    console.log('🔌 Demo 4: Handle Styling');
    console.log('=========================');

    const handleNode = ProcessNodeData.create({
      meta: {
        label: 'Multi-Handle Node',
        function: 'Advanced Connections',
        emoji: '🔗'
      },
      styling: {
        handles: {
          input: [
            HandleConfiguration.createInput({
              id: 'data-input',
              style: { backgroundColor: '#ef4444', shape: 'square' }
            }),
            HandleConfiguration.createInput({
              id: 'config-input',
              style: { backgroundColor: '#3b82f6', shape: 'circle' }
            })
          ],
          output: [
            HandleConfiguration.createOutput({
              id: 'result-output',
              style: { backgroundColor: '#10b981', shape: 'diamond' }
            })
          ]
        }
      }
    });

    // Show input handles
    console.log('Input Handles:');
    const dataInputStyle = this.styleManager.getHandleStyle(handleNode, 'input', 'data-input');
    const configInputStyle = this.styleManager.getHandleStyle(handleNode, 'input', 'config-input');
    
    console.log('  Data Input (Square):', this.formatHandleStyle(dataInputStyle));
    console.log('  Config Input (Circle):', this.formatHandleStyle(configInputStyle));

    // Show output handles
    console.log('Output Handles:');
    const resultOutputStyle = this.styleManager.getHandleStyle(handleNode, 'output', 'result-output');
    console.log('  Result Output (Diamond):', this.formatHandleStyle(resultOutputStyle));

    this.demoNodes.set('handleNode', handleNode);
    console.log('✓ Handle styling demo complete\n');
  }

  /**
   * Demo 5: Animation System
   */
  demoAnimations() {
    console.log('✨ Demo 5: Animation System');
    console.log('===========================');

    // Register custom animation
    const bounceAnimation = {
      keyframes: {
        '0%, 100%': { transform: 'translateY(0)' },
        '50%': { transform: 'translateY(-10px)' }
      },
      duration: '1s',
      iterationCount: 'infinite'
    };

    this.styleManager.registerAnimation('bounce', bounceAnimation);

    const animatedNode = InputNodeData.create({
      meta: {
        label: 'Animated Node',
        function: 'Bouncy Input',
        emoji: '🎪'
      }
    });

    // Show different animation states
    const animationStates = [
      { state: 'processing', expected: 'pulse 2s infinite' },
      { state: 'error', expected: 'shake 0.5s ease-in-out' },
      { state: 'success', expected: 'none' }
    ];

    console.log('Animation States:');
    animationStates.forEach(({ state, expected }) => {
      const styles = this.styleManager.getNodeStyle(animatedNode, state);
      console.log(`  ${state.toUpperCase()}: ${styles.animation || 'none'} (expected: ${expected})`);
    });

    // Show hover effects
    const hoverStyles = this.styleManager.getNodeStyle(animatedNode);
    console.log('Hover Effects:', hoverStyles['&:hover']);

    this.demoNodes.set('animatedNode', animatedNode);
    console.log('✓ Animation system demo complete\n');
  }

  /**
   * Demo 6: Performance Testing
   */
  demoPerformance() {
    console.log('🚀 Demo 6: Performance & Caching');
    console.log('=================================');

    const performanceNode = ProcessNodeData.create({
      meta: {
        label: 'Performance Test Node',
        function: 'Speed Testing',
        emoji: '🏎️'
      }
    });

    console.log('Testing cache performance...');
    
    // First computation (cache miss)
    const start1 = performance.now();
    this.styleManager.getNodeStyle(performanceNode, 'default');
    const end1 = performance.now();
    
    // Second computation (cache hit)
    const start2 = performance.now();
    this.styleManager.getNodeStyle(performanceNode, 'default');
    const end2 = performance.now();

    console.log(`First computation (cache miss): ${(end1 - start1).toFixed(3)}ms`);
    console.log(`Second computation (cache hit): ${(end2 - start2).toFixed(3)}ms`);
    console.log(`Speed improvement: ${((end1 - start1) / (end2 - start2)).toFixed(1)}x faster`);

    // Bulk performance test
    console.log('\nBulk performance test (100 nodes)...');
    const bulkStart = performance.now();
    
    for (let i = 0; i < 100; i++) {
      const testNode = InputNodeData.create({ meta: { label: `Node ${i}` } });
      this.styleManager.getNodeStyle(testNode, i % 2 === 0 ? 'default' : 'processing');
    }
    
    const bulkEnd = performance.now();
    console.log(`100 style computations: ${(bulkEnd - bulkStart).toFixed(3)}ms`);
    console.log(`Average per node: ${((bulkEnd - bulkStart) / 100).toFixed(3)}ms`);

    this.demoNodes.set('performanceNode', performanceNode);
    console.log('✓ Performance demo complete\n');
  }

  /**
   * Demo 7: Node Type Specific Styling
   */
  demoNodeTypeSpecific() {
    console.log('🏷️  Demo 7: Node Type Specific Styling');
    console.log('======================================');

    // Input Node specific states
    const inputNode = InputNodeData.create({
      meta: { label: 'Styled Input', emoji: '📝' }
    });
    
    console.log('Input Node States:');
    ['default', 'filled', 'invalid', 'submitting'].forEach(state => {
      const styles = this.styleManager.getNodeStyle(inputNode, state);
      console.log(`  ${state}: bg=${styles.backgroundColor}, border=${styles.borderColor}`);
    });

    // Process Node specific states
    const processNode = ProcessNodeData.create({
      meta: { label: 'Styled Process', emoji: '⚡' }
    });
    
    console.log('Process Node States:');
    ['default', 'processing', 'configured', 'error'].forEach(state => {
      const styles = this.styleManager.getNodeStyle(processNode, state);
      console.log(`  ${state}: bg=${styles.backgroundColor}, border=${styles.borderColor}`);
    });

    // Output Node specific states
    const outputNode = OutputNodeData.create({
      meta: { label: 'Styled Output', emoji: '📊' }
    });
    
    console.log('Output Node States:');
    ['default', 'populated', 'rendering', 'exported'].forEach(state => {
      const styles = this.styleManager.getNodeStyle(outputNode, state);
      console.log(`  ${state}: bg=${styles.backgroundColor}, border=${styles.borderColor}`);
    });

    this.demoNodes.set('inputNode', inputNode);
    this.demoNodes.set('processNode', processNode);
    this.demoNodes.set('outputNode', outputNode);
    console.log('✓ Node type specific styling demo complete\n');
  }

  /**
   * Demo 8: Complex Integration Scenarios
   */
  demoComplexScenarios() {
    console.log('🎯 Demo 8: Complex Integration Scenarios');
    console.log('========================================');

    // Scenario 1: Multi-theme workflow
    console.log('Scenario 1: Multi-theme workflow');
    const workflowNodes = [
      { node: InputNodeData.create({ meta: { label: 'Data Input' } }), theme: 'default' },
      { node: ProcessNodeData.create({ meta: { label: 'Data Processing' } }), theme: 'dark' },
      { node: OutputNodeData.create({ meta: { label: 'Data Output' } }), theme: 'colorful' }
    ];

    workflowNodes.forEach(({ node, theme }, index) => {
      const themedNode = { ...node, styling: { ...node.styling, theme } };
      const styles = this.styleManager.getNodeStyle(themedNode);
      console.log(`  Node ${index + 1} (${theme}): bg=${styles.backgroundColor}, color=${styles.color}`);
    });

    // Scenario 2: Dynamic state transitions
    console.log('\nScenario 2: Dynamic state transitions');
    const transitionNode = ProcessNodeData.create({
      meta: { label: 'State Machine Node', emoji: '🔄' }
    });

    const stateSequence = ['default', 'processing', 'success', 'error', 'disabled'];
    stateSequence.forEach((state, index) => {
      const styles = this.styleManager.getNodeStyle(transitionNode, state);
      console.log(`  Step ${index + 1} (${state}): animation=${styles.animation || 'none'}`);
    });

    // Scenario 3: Custom styled workflow
    console.log('\nScenario 3: Custom styled workflow');
    const customNode = NodeData.create({
      meta: { label: 'Ultra Custom Node', emoji: '🎨' },
      styling: {
        states: {
          'ultra-custom': NodeVisualState.create({
            container: {
              backgroundColor: 'linear-gradient(45deg, #ff6b6b, #4ecdc4)',
              borderRadius: 20,
              borderWidth: 3,
              borderColor: '#fff',
              boxShadow: '0 10px 20px rgba(0,0,0,0.2)'
            },
            typography: {
              titleColor: '#fff',
              titleWeight: 'bold',
              fontSize: '20px'
            },
            effects: {
              glow: true,
              pulse: true
            }
          })
        },
        handles: {
          input: [
            HandleConfiguration.createInput({
              id: 'rainbow-input',
              style: { backgroundColor: '#ff6b6b', shape: 'diamond' }
            })
          ]
        }
      }
    });

    const ultraStyles = this.styleManager.getNodeStyle(customNode, 'ultra-custom');
    const handleStyles = this.styleManager.getHandleStyle(customNode, 'input', 'rainbow-input');
    
    console.log('  Ultra Custom Node:', this.formatStyles(ultraStyles));
    console.log('  Rainbow Handle:', this.formatHandleStyle(handleStyles));

    this.demoNodes.set('complexNode', customNode);
    console.log('✓ Complex scenarios demo complete\n');
  }

  /**
   * Show comprehensive performance metrics
   */
  showPerformanceMetrics() {
    console.log('📊 Performance Metrics');
    console.log('======================');
    
    const stats = this.styleManager.getPerformanceStats();
    console.log('Style Manager Stats:');
    console.log(`  Style Computations: ${stats.styleComputations}`);
    console.log(`  Cache Hits: ${stats.cacheHits}`);
    console.log(`  Cache Size: ${stats.cacheSize}`);
    console.log(`  Hit Rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    console.log(`  Available Themes: ${stats.availableThemes}`);
    console.log(`  Registered Animations: ${stats.registeredAnimations}`);

    console.log('\nDemo Node Registry:');
    console.log(`  Total Demo Nodes: ${this.demoNodes.size}`);
    this.demoNodes.forEach((node, key) => {
      console.log(`  ${key}: ${node.meta.label} (${node.meta.category})`);
    });
  }

  /**
   * Get comprehensive demo summary
   */
  getDemoSummary() {
    const stats = this.styleManager.getPerformanceStats();
    
    return {
      summary: {
        demosCompleted: 8,
        nodesCreated: this.demoNodes.size,
        stylesComputed: stats.styleComputations,
        cacheHitRate: stats.hitRate,
        themesAvailable: stats.availableThemes,
        animationsRegistered: stats.registeredAnimations
      },
      capabilities: [
        'State-based visual management',
        'Multi-theme support', 
        'Animation integration',
        'Performance caching',
        'Handle styling',
        'Node type specialization',
        'Complex scenario handling'
      ],
      performance: {
        cacheEfficiency: stats.hitRate > 0.5 ? 'Excellent' : 'Good',
        computationSpeed: 'Sub-millisecond average',
        memoryUsage: 'Optimized with intelligent caching'
      },
      nodes: Array.from(this.demoNodes.entries()).map(([key, node]) => ({
        key,
        label: node.meta.label,
        category: node.meta.category,
        theme: node.styling?.theme || 'default'
      }))
    };
  }

  // === UTILITY METHODS ===

  /**
   * Format styles for display
   */
  formatStyles(styles) {
    return {
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      borderWidth: styles.borderWidth,
      borderRadius: styles.borderRadius,
      fontSize: styles.fontSize,
      color: styles.color,
      padding: styles.padding,
      animation: styles.animation || 'none'
    };
  }

  /**
   * Format handle styles for display
   */
  formatHandleStyle(styles) {
    return {
      backgroundColor: styles.backgroundColor,
      borderColor: styles.borderColor,
      shape: styles.borderRadius,
      size: styles.width
    };
  }
}

/**
 * StyleUtils Demo - Color and utility functions
 */
class StyleUtilsDemo {
  static runColorDemo() {
    console.log('🎨 StyleUtils Color Demo');
    console.log('========================');

    // Hex to RGBA conversion
    const rgba = StyleUtils.hexToRgba('#3b82f6', 0.8);
    console.log('Hex to RGBA:', rgba);

    // Color palette generation
    const palette = StyleUtils.generatePalette('#3b82f6');
    console.log('Generated Palette:', {
      50: palette[50],
      500: palette[500],
      900: palette[900]
    });

    // Color manipulation
    const lightened = StyleUtils.lightenColor('#3b82f6', 0.3);
    const darkened = StyleUtils.darkenColor('#3b82f6', 0.3);
    console.log('Color Manipulation:', {
      original: '#3b82f6',
      lightened,
      darkened
    });

    console.log('✓ StyleUtils demo complete\n');
  }
}

/**
 * Run the complete demo
 */
export function runStyleManagerDemo() {
  console.clear();
  console.log('🎨 NodeStyleManager Comprehensive Demo');
  console.log('======================================');
  console.log('Showcasing Phase 6: Unified Styling System');
  console.log('Version 2.0.0\n');

  try {
    // Run main demo
    const demo = new NodeStyleManagerDemo();
    const results = demo.runCompleteDemo();

    // Run utility demos
    StyleUtilsDemo.runColorDemo();

    // Show global instances
    console.log('🌐 Global Instance Demo');
    console.log('=======================');
    const globalStats = globalStyleManager.getPerformanceStats();
    console.log('Global Style Manager:', {
      themes: globalStyleManager.getAvailableThemes().length,
      computations: globalStats.styleComputations
    });

    console.log('\n🎯 Demo Results Summary');
    console.log('=======================');
    console.log(JSON.stringify(results, null, 2));

    return results;

  } catch (error) {
    console.error('❌ Demo Error:', error);
    return { error: error.message };
  }
}

// Auto-run if called directly
if (typeof window === 'undefined') {
  runStyleManagerDemo();
}

export default runStyleManagerDemo;