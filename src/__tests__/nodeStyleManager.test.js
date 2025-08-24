/**
 * NodeStyleManager Tests
 * Comprehensive test suite for Phase 6: Unified Styling System
 * Version 2.0.0
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  NodeStyleManager, 
  StyleUtils, 
  AnimationInjector,
  globalStyleManager,
  globalAnimationInjector
} from '../styles/nodeStyleManager.js';
import { 
  NodeData, 
  InputNodeData, 
  ProcessNodeData, 
  OutputNodeData,
  NodeVisualState, 
  HandleConfiguration 
} from '../types/nodeSchema.js';

describe('NodeStyleManager', () => {
  let styleManager;
  let mockNodeData;

  beforeEach(() => {
    styleManager = new NodeStyleManager();
    mockNodeData = InputNodeData.create({
      meta: {
        label: 'Test Node',
        function: 'Test Function',
        emoji: '🧪'
      }
    });
  });

  afterEach(() => {
    styleManager.clearCache();
  });

  describe('Basic Styling', () => {
    it('should create NodeStyleManager instance', () => {
      expect(styleManager).toBeInstanceOf(NodeStyleManager);
      expect(styleManager.styleStates).toBeInstanceOf(Map);
      expect(styleManager.themeProviders).toBeInstanceOf(Map);
      expect(styleManager.animationRegistry).toBeInstanceOf(Map);
    });

    it('should return default styles for node with default state', () => {
      const styles = styleManager.getNodeStyle(mockNodeData);
      
      expect(styles).toHaveProperty('backgroundColor');
      expect(styles).toHaveProperty('borderColor');
      expect(styles).toHaveProperty('borderWidth');
      expect(styles).toHaveProperty('borderRadius');
      expect(styles).toHaveProperty('padding');
      expect(styles).toHaveProperty('fontSize');
      expect(styles).toHaveProperty('color');
      expect(styles.borderStyle).toBe('solid');
    });

    it('should return different styles for different states', () => {
      // Use ProcessNodeData for states that exist on it
      const processNode = ProcessNodeData.create({
        meta: { label: 'Test Process Node', emoji: '⚡' }
      });
      
      const defaultStyles = styleManager.getNodeStyle(processNode, 'default');
      const processingStyles = styleManager.getNodeStyle(processNode, 'processing');
      const errorStyles = styleManager.getNodeStyle(processNode, 'error');

      expect(defaultStyles.backgroundColor).not.toBe(processingStyles.backgroundColor);
      expect(defaultStyles.borderColor).not.toBe(errorStyles.borderColor);
    });

    it('should apply style overrides', () => {
      const overrides = {
        backgroundColor: '#ff0000',
        fontSize: '20px'
      };
      
      const styles = styleManager.getNodeStyle(mockNodeData, 'default', overrides);
      
      expect(styles.backgroundColor).toBe('#ff0000');
      expect(styles.fontSize).toBe('20px');
    });
  });

  describe('Visual State Management', () => {
    it('should handle processing state with pulse animation', () => {
      // Use ProcessNodeData which has processing state
      const processNode = ProcessNodeData.create({
        meta: { label: 'Processing Test Node', emoji: '⚡' }
      });
      
      const styles = styleManager.getNodeStyle(processNode, 'processing');
      
      expect(styles.animation).toBe('pulse 2s infinite');
      expect(styles.backgroundColor).toBe('#fef3c7');
      expect(styles.borderColor).toBe('#f59e0b');
    });

    it('should handle success state with glow effect', () => {
      // Create a node with success state defined
      const nodeWithSuccessState = NodeData.create({
        meta: { label: 'Success Test Node', emoji: '✅' },
        styling: {
          states: {
            success: NodeVisualState.createSuccess()
          }
        }
      });
      
      const styles = styleManager.getNodeStyle(nodeWithSuccessState, 'success');
      
      expect(styles.boxShadow).toContain('rgba(16, 185, 129, 0.3)');
      expect(styles.backgroundColor).toBe('#ecfdf5');
      expect(styles.borderColor).toBe('#10b981');
    });

    it('should handle error state with shake animation', () => {
      // Create a node with error state defined
      const nodeWithErrorState = NodeData.create({
        meta: { label: 'Error Test Node', emoji: '❌' },
        styling: {
          states: {
            error: NodeVisualState.createError()
          }
        }
      });
      
      const styles = styleManager.getNodeStyle(nodeWithErrorState, 'error');
      
      expect(styles.animation).toBe('shake 0.5s ease-in-out');
      expect(styles.backgroundColor).toBe('#fef2f2');
      expect(styles.borderColor).toBe('#ef4444');
    });

    it('should update visual state dynamically', () => {
      const customOverrides = {
        container: {
          backgroundColor: '#custom-color',
          borderRadius: 12
        }
      };

      const updatedNodeData = styleManager.updateVisualState(
        mockNodeData, 
        'custom', 
        customOverrides
      );

      expect(updatedNodeData.styling.states.custom).toBeDefined();
      expect(updatedNodeData.styling.states.custom.container.backgroundColor).toBe('#custom-color');
      expect(updatedNodeData.styling.states.custom.container.borderRadius).toBe(12);
    });
  });

  describe('Handle Styling', () => {
    it('should return input handle styles', () => {
      const handleStyles = styleManager.getHandleStyle(mockNodeData, 'input');
      
      expect(handleStyles).toHaveProperty('backgroundColor');
      expect(handleStyles).toHaveProperty('borderColor');
      expect(handleStyles).toHaveProperty('width');
      expect(handleStyles).toHaveProperty('height');
      expect(handleStyles).toHaveProperty('borderRadius');
      expect(handleStyles.position).toBe('absolute');
      expect(handleStyles.zIndex).toBe(10);
    });

    it('should return output handle styles', () => {
      const handleStyles = styleManager.getHandleStyle(mockNodeData, 'output');
      
      expect(handleStyles.backgroundColor).toBe('#3b82f6');
      expect(handleStyles.borderColor).toBe('#1e40af');
    });

    it('should handle specific handle ID', () => {
      const processNodeData = ProcessNodeData.create({
        meta: { label: 'Process Node' },
        styling: {
          handles: {
            input: [
              HandleConfiguration.createInput({
                id: 'multi-input',
                style: { backgroundColor: '#custom-input' }
              })
            ]
          }
        }
      });

      const handleStyles = styleManager.getHandleStyle(processNodeData, 'input', 'multi-input');
      expect(handleStyles.backgroundColor).toBe('#custom-input');
    });

    it('should handle different handle shapes', () => {
      const nodeDataWithSquareHandle = NodeData.create({
        styling: {
          handles: {
            input: [
              HandleConfiguration.createInput({
                id: 'square-handle',
                style: { shape: 'square' }
              })
            ]
          }
        }
      });

      const handleStyles = styleManager.getHandleStyle(nodeDataWithSquareHandle, 'input', 'square-handle');
      expect(handleStyles.borderRadius).toBe('0');
    });
  });

  describe('Theme System', () => {
    it('should register and retrieve themes', () => {
      const customTheme = {
        container: { backgroundColor: '#custom-bg' },
        typography: { titleColor: '#custom-text' }
      };

      styleManager.registerTheme('custom', customTheme);
      
      const availableThemes = styleManager.getAvailableThemes();
      expect(availableThemes).toContain('custom');
      expect(availableThemes).toContain('default');
      expect(availableThemes).toContain('dark');
      expect(availableThemes).toContain('colorful');
    });

    it('should apply theme to node styles', () => {
      // Create a node with empty visual state object to let theme provide defaults
      const themedNodeData = NodeData.create({
        meta: { label: 'Themed Test Node', emoji: '🌙' },
        styling: {
          theme: 'dark',
          states: {
            default: {
              // Completely empty state - let theme provide everything
              container: {},
              typography: {},
              layout: {},
              animation: {},
              effects: {}
            }
          }
        }
      });

      const styles = styleManager.getNodeStyle(themedNodeData);
      
      // Dark theme should be applied since visual state is empty
      expect(styles.backgroundColor).toBe('#1f2937');
      expect(styles.borderColor).toBe('#374151');
      expect(styles.color).toBe('#f9fafb');
    });

    it('should fall back to default theme for unknown themes', () => {
      const nodeDataWithUnknownTheme = {
        ...mockNodeData,
        styling: {
          ...mockNodeData.styling,
          theme: 'non-existent-theme'
        }
      };

      const styles = styleManager.getNodeStyle(nodeDataWithUnknownTheme);
      
      // Should use default styles
      expect(styles).toBeDefined();
      expect(styles.backgroundColor).toBe('#ffffff');
    });
  });

  describe('Animation System', () => {
    it('should register custom animations', () => {
      const customAnimation = {
        keyframes: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 }
        },
        duration: '1s'
      };

      styleManager.registerAnimation('customFade', customAnimation);
      
      const stats = styleManager.getPerformanceStats();
      expect(stats.registeredAnimations).toBeGreaterThan(0);
    });

    it('should add hover effects to styles', () => {
      const styles = styleManager.getNodeStyle(mockNodeData);
      
      expect(styles['&:hover']).toEqual({
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 12px rgba(0, 0, 0, 0.15)'
      });
    });
  });

  describe('Performance and Caching', () => {
    it('should cache computed styles', () => {
      // First computation
      styleManager.getNodeStyle(mockNodeData, 'default');
      const stats1 = styleManager.getPerformanceStats();
      
      // Second computation (should hit cache)
      styleManager.getNodeStyle(mockNodeData, 'default');
      const stats2 = styleManager.getPerformanceStats();
      
      expect(stats2.cacheHits).toBe(stats1.cacheHits + 1);
      expect(stats2.styleComputations).toBe(stats1.styleComputations);
    });

    it('should generate different cache keys for different states', () => {
      styleManager.getNodeStyle(mockNodeData, 'default');
      styleManager.getNodeStyle(mockNodeData, 'processing');
      
      const stats = styleManager.getPerformanceStats();
      expect(stats.cacheSize).toBe(2);
    });

    it('should clear cache', () => {
      styleManager.getNodeStyle(mockNodeData, 'default');
      expect(styleManager.getPerformanceStats().cacheSize).toBeGreaterThan(0);
      
      styleManager.clearCache();
      const stats = styleManager.getPerformanceStats();
      expect(stats.cacheSize).toBe(0);
      expect(stats.styleComputations).toBe(0);
      expect(stats.cacheHits).toBe(0);
    });

    it('should track performance metrics', () => {
      styleManager.getNodeStyle(mockNodeData, 'default');
      styleManager.getNodeStyle(mockNodeData, 'processing');
      styleManager.getNodeStyle(mockNodeData, 'default'); // Cache hit
      
      const stats = styleManager.getPerformanceStats();
      expect(stats.styleComputations).toBe(2);
      expect(stats.cacheHits).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.5);
      expect(stats.cacheSize).toBe(2);
      expect(stats.availableThemes).toBeGreaterThan(0);
    });
  });

  describe('Node Type Specific Styling', () => {
    it('should handle input node styling', () => {
      const inputNode = InputNodeData.create({
        meta: { label: 'Input Test' }
      });
      
      // Test that the input node has the filled state defined
      expect(inputNode.styling.states.filled).toBeDefined();
      
      const styles = styleManager.getNodeStyle(inputNode, 'filled');
      expect(styles.backgroundColor).toBe('#f0f9ff');
      expect(styles.borderColor).toBe('#0ea5e9');
    });

    it('should handle process node styling', () => {
      const processNode = ProcessNodeData.create({
        meta: { label: 'Process Test' }
      });
      
      // Test that the process node has the configured state defined
      expect(processNode.styling.states.configured).toBeDefined();
      
      const styles = styleManager.getNodeStyle(processNode, 'configured');
      expect(styles.backgroundColor).toBe('#ecfdf5');
      expect(styles.borderColor).toBe('#10b981');
    });

    it('should handle output node styling', () => {
      const outputNode = OutputNodeData.create({
        meta: { label: 'Output Test' }
      });
      
      // Test that the output node has the populated state defined
      expect(outputNode.styling.states.populated).toBeDefined();
      
      const styles = styleManager.getNodeStyle(outputNode, 'populated');
      expect(styles.backgroundColor).toBe('#f0f9ff');
      expect(styles.borderColor).toBe('#0ea5e9');
    });
  });
});

describe('StyleUtils', () => {
  describe('Color Utilities', () => {
    it('should convert hex to rgba', () => {
      const rgba = StyleUtils.hexToRgba('#ff0000', 0.5);
      expect(rgba).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('should generate color palette', () => {
      const palette = StyleUtils.generatePalette('#3b82f6');
      
      expect(palette).toHaveProperty('50');
      expect(palette).toHaveProperty('500');
      expect(palette).toHaveProperty('900');
      expect(palette['500']).toBe('#3b82f6');
    });

    it('should lighten colors', () => {
      const lightened = StyleUtils.lightenColor('#000000', 0.5);
      expect(lightened).not.toBe('#000000');
      expect(lightened).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('should darken colors', () => {
      const darkened = StyleUtils.darkenColor('#ffffff', 0.5);
      expect(darkened).not.toBe('#ffffff');
      expect(darkened).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});

describe('AnimationInjector', () => {
  let animationInjector;
  let mockDocument;

  beforeEach(() => {
    animationInjector = new AnimationInjector();
    
    // Mock DOM
    mockDocument = {
      createElement: vi.fn(() => ({
        textContent: '',
      })),
      head: {
        appendChild: vi.fn(),
        querySelectorAll: vi.fn(() => [])
      }
    };
    
    // Replace global document
    global.document = mockDocument;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should inject keyframes', () => {
    const keyframes = {
      '0%': { opacity: '0' },
      '100%': { opacity: '1' }
    };

    animationInjector.injectKeyframes('fadeIn', keyframes);

    expect(mockDocument.createElement).toHaveBeenCalledWith('style');
    expect(mockDocument.head.appendChild).toHaveBeenCalled();
  });

  it('should not inject duplicate keyframes', () => {
    const keyframes = { '0%': { opacity: '0' } };

    animationInjector.injectKeyframes('test', keyframes);
    animationInjector.injectKeyframes('test', keyframes);

    expect(mockDocument.createElement).toHaveBeenCalledTimes(1);
  });
});

describe('Global Instances', () => {
  let testNodeData;

  beforeEach(() => {
    testNodeData = InputNodeData.create({
      meta: { label: 'Global Test Node', emoji: '🌐' }
    });
  });

  it('should provide global style manager instance', () => {
    expect(globalStyleManager).toBeInstanceOf(NodeStyleManager);
  });

  it('should provide global animation injector instance', () => {
    expect(globalAnimationInjector).toBeInstanceOf(AnimationInjector);
  });

  it('should have consistent behavior across global instances', () => {
    const styles1 = globalStyleManager.getNodeStyle(testNodeData);
    const styles2 = globalStyleManager.getNodeStyle(testNodeData);
    
    expect(styles1).toEqual(styles2);
  });
});

describe('Integration Tests', () => {
  let testStyleManager;

  beforeEach(() => {
    testStyleManager = new NodeStyleManager();
  });

  it('should work with complex node configurations', () => {
    const complexNode = ProcessNodeData.create({
      meta: {
        label: 'Complex Processing Node',
        function: 'Advanced Data Processing',
        emoji: '⚡'
      },
      styling: {
        theme: 'dark',
        states: {
          custom: NodeVisualState.create({
            container: {
              backgroundColor: '#purple',
              borderRadius: 16
            },
            typography: {
              titleSize: '18px'
            }
          })
        },
        handles: {
          input: [
            HandleConfiguration.createInput({
              id: 'data-input',
              style: { backgroundColor: '#green' }
            })
          ],
          output: [
            HandleConfiguration.createOutput({
              id: 'result-output',
              style: { backgroundColor: '#blue', shape: 'square' }
            })
          ]
        }
      }
    });

    const nodeStyles = testStyleManager.getNodeStyle(complexNode, 'custom');
    const inputHandleStyles = testStyleManager.getHandleStyle(complexNode, 'input', 'data-input');
    const outputHandleStyles = testStyleManager.getHandleStyle(complexNode, 'output', 'result-output');

    expect(nodeStyles.backgroundColor).toBe('#purple');
    expect(nodeStyles.borderRadius).toBe('16px');
    expect(nodeStyles.fontSize).toBe('18px');
    
    expect(inputHandleStyles.backgroundColor).toBe('#green');
    expect(outputHandleStyles.backgroundColor).toBe('#blue');
    expect(outputHandleStyles.borderRadius).toBe('0');
  });

  it('should maintain performance with multiple style computations', () => {
    const nodes = Array.from({ length: 100 }, (_, i) =>
      InputNodeData.create({ meta: { label: `Node ${i}` } })
    );

    const startTime = performance.now();
    
    nodes.forEach((node, i) => {
      testStyleManager.getNodeStyle(node, i % 2 === 0 ? 'default' : 'filled');
    });

    const endTime = performance.now();
    const computationTime = endTime - startTime;

    // Should complete in reasonable time (less than 100ms)
    expect(computationTime).toBeLessThan(100);

    const stats = testStyleManager.getPerformanceStats();
    expect(stats.styleComputations).toBeLessThanOrEqual(nodes.length);
    expect(stats.cacheSize).toBeGreaterThan(0);
  });
});