/**
 * Node Style Manager - Unified Styling System
 * Phase 6 Implementation - Based on COMPREHENSIVE_IMPLEMENTATION_PLAN.md
 * Version 2.0.0
 */

import { NodeVisualState, HandleConfiguration } from '../types/nodeSchema.js';

/**
 * NodeStyleManager - Central styling management system
 * Provides unified styling, state management, theme integration, and animations
 */
export class NodeStyleManager {
  constructor() {
    // Style state cache for performance
    this.styleStates = new Map();
    
    // Theme providers registry
    this.themeProviders = new Map();
    
    // Animation system
    this.animationRegistry = new Map();
    
    // Performance tracking
    this.styleComputationCount = 0;
    this.cacheHitCount = 0;
    
    // Initialize default theme
    this._initializeDefaultTheme();
    
    // Initialize animation presets
    this._initializeAnimations();
  }

  /**
   * Get computed styles for a node based on its current state
   * @param {Object} nodeData - Node data with styling configuration
   * @param {string} currentState - Current visual state (default, processing, success, error, etc.)
   * @param {Object} overrides - Optional style overrides
   * @returns {Object} React-compatible style object
   */
  getNodeStyle(nodeData, currentState = 'default', overrides = {}) {
    // Generate cache key
    const cacheKey = this._generateStyleCacheKey(nodeData, currentState, overrides);
    
    // Check cache first
    if (this.styleStates.has(cacheKey)) {
      this.cacheHitCount++;
      return this.styleStates.get(cacheKey);
    }
    
    this.styleComputationCount++;
    
    // Get styling configuration from node data
    const stylingConfig = nodeData.styling || {};
    
    // Get visual state (fallback to default if not found)
    const visualState = stylingConfig.states?.[currentState] || 
                       stylingConfig.states?.default || 
                       NodeVisualState.createDefault();
    
    // Apply theme modifications
    const themedState = this._applyTheme(visualState, stylingConfig.theme);
    
    // Convert to React-compatible styles
    const reactStyles = this._convertToReactStyles(themedState, overrides);
    
    // Add animations if specified
    const styledWithAnimations = this._addAnimations(reactStyles, themedState, currentState);
    
    // Cache the result
    this.styleStates.set(cacheKey, styledWithAnimations);
    
    return styledWithAnimations;
  }

  /**
   * Get handle styles for a node's connection points
   * @param {Object} nodeData - Node data with styling configuration
   * @param {string} handleType - 'input' or 'output'
   * @param {string} handleId - Specific handle ID
   * @returns {Object} Handle style configuration
   */
  getHandleStyle(nodeData, handleType = 'input', handleId = null) {
    const stylingConfig = nodeData.styling || {};
    const handles = stylingConfig.handles?.[handleType] || [];
    
    let handleConfig;
    if (handleId) {
      handleConfig = handles.find(h => h.id === handleId);
    } else {
      handleConfig = handles[0]; // Get first handle if no ID specified
    }
    
    // Fallback to default handle configuration
    if (!handleConfig) {
      handleConfig = handleType === 'input' 
        ? HandleConfiguration.createInput()
        : HandleConfiguration.createOutput();
    }
    
    return this._convertHandleToReactStyles(handleConfig);
  }

  /**
   * Update node visual state dynamically
   * @param {Object} nodeData - Node data to update
   * @param {string} stateName - State to update
   * @param {Object} stateOverrides - Style overrides for the state
   * @returns {Object} Updated node data
   */
  updateVisualState(nodeData, stateName, stateOverrides) {
    const updatedStyling = {
      ...nodeData.styling,
      states: {
        ...nodeData.styling?.states,
        [stateName]: NodeVisualState.create(stateOverrides)
      }
    };

    return {
      ...nodeData,
      styling: updatedStyling
    };
  }

  /**
   * Register a theme provider
   * @param {string} themeName - Name of the theme
   * @param {Object} themeConfig - Theme configuration
   */
  registerTheme(themeName, themeConfig) {
    this.themeProviders.set(themeName, {
      ...themeConfig,
      registered: new Date().toISOString()
    });
  }

  /**
   * Get available themes
   * @returns {Array} List of available theme names
   */
  getAvailableThemes() {
    return Array.from(this.themeProviders.keys());
  }

  /**
   * Register custom animation
   * @param {string} animationName - Name of the animation
   * @param {Object} animationConfig - Animation configuration
   */
  registerAnimation(animationName, animationConfig) {
    this.animationRegistry.set(animationName, animationConfig);
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance metrics
   */
  getPerformanceStats() {
    return {
      styleComputations: this.styleComputationCount,
      cacheHits: this.cacheHitCount,
      cacheSize: this.styleStates.size,
      hitRate: this.styleComputationCount > 0 ? this.cacheHitCount / this.styleComputationCount : 0,
      availableThemes: this.themeProviders.size,
      registeredAnimations: this.animationRegistry.size
    };
  }

  /**
   * Clear style cache
   */
  clearCache() {
    this.styleStates.clear();
    this.styleComputationCount = 0;
    this.cacheHitCount = 0;
  }

  // === PRIVATE METHODS ===

  /**
   * Convert NodeVisualState to React-compatible styles
   * @private
   */
  _convertToReactStyles(visualState, overrides = {}) {
    const baseStyle = {
      // Container styles
      backgroundColor: visualState.container?.backgroundColor,
      borderColor: visualState.container?.borderColor,
      borderWidth: `${visualState.container?.borderWidth}px`,
      borderRadius: `${visualState.container?.borderRadius}px`,
      boxShadow: visualState.container?.boxShadow,
      opacity: visualState.container?.opacity,
      transform: visualState.container?.scale !== 1 ? `scale(${visualState.container.scale})` : undefined,

      // Typography styles
      fontSize: visualState.typography?.titleSize,
      color: visualState.typography?.titleColor,
      fontWeight: visualState.typography?.titleWeight,
      fontFamily: visualState.typography?.fontFamily,

      // Layout styles
      padding: `${visualState.layout?.padding}px`,
      minWidth: `${visualState.layout?.minWidth}px`,
      maxWidth: `${visualState.layout?.maxWidth}px`,
      minHeight: `${visualState.layout?.minHeight}px`,
      maxHeight: `${visualState.layout?.maxHeight}px`,

      // Animation styles
      transitionDuration: `${visualState.animation?.duration}ms`,
      transitionTimingFunction: visualState.animation?.easing,
      transitionProperty: visualState.animation?.transition?.join(', '),

      // Border style
      borderStyle: 'solid',

      // Apply overrides
      ...overrides
    };

    // Remove undefined values
    return Object.fromEntries(
      Object.entries(baseStyle).filter(([_, value]) => value !== undefined)
    );
  }

  /**
   * Convert handle configuration to React styles
   * @private
   */
  _convertHandleToReactStyles(handleConfig) {
    return {
      backgroundColor: handleConfig.style?.backgroundColor,
      borderColor: handleConfig.style?.borderColor,
      width: `${handleConfig.style?.size}px`,
      height: `${handleConfig.style?.size}px`,
      borderRadius: handleConfig.style?.shape === 'circle' ? '50%' : 
                   handleConfig.style?.shape === 'square' ? '0' : '25%',
      border: '2px solid',
      position: 'absolute',
      // Position based on handle position
      [handleConfig.position]: handleConfig.offset?.x || 0,
      top: `calc(50% + ${handleConfig.offset?.y || 0}px)`,
      transform: 'translateY(-50%)',
      zIndex: 10
    };
  }

  /**
   * Apply theme modifications to visual state
   * Theme should provide defaults, but state-specific values should take precedence
   * @private
   */
  _applyTheme(visualState, themeName = 'default') {
    const theme = this.themeProviders.get(themeName);
    if (!theme) return visualState;

    // Apply theme as base, then override with specific visual state values
    return {
      container: { ...theme.container, ...visualState.container },
      typography: { ...theme.typography, ...visualState.typography },
      layout: { ...theme.layout, ...visualState.layout },
      animation: { ...theme.animation, ...visualState.animation },
      effects: { ...theme.effects, ...visualState.effects }
    };
  }

  /**
   * Add animations to styles based on state and effects
   * @private
   */
  _addAnimations(styles, visualState, currentState) {
    const animatedStyles = { ...styles };

    // Add pulse animation for processing states
    if (visualState.effects?.pulse || currentState === 'processing') {
      animatedStyles.animation = 'pulse 2s infinite';
    }

    // Add glow effect for success states
    if (currentState === 'success') {
      animatedStyles.boxShadow = `${styles.boxShadow || '0 4px 6px rgba(0, 0, 0, 0.1)'}, 0 0 15px rgba(16, 185, 129, 0.3)`;
    }

    // Add shake animation for error states
    if (currentState === 'error') {
      animatedStyles.animation = 'shake 0.5s ease-in-out';
    }

    // Add hover effects
    animatedStyles['&:hover'] = {
      transform: 'translateY(-2px)',
      boxShadow: '0 8px 12px rgba(0, 0, 0, 0.15)'
    };

    return animatedStyles;
  }

  /**
   * Generate cache key for style computation
   * @private
   */
  _generateStyleCacheKey(nodeData, currentState, overrides) {
    const keyData = {
      nodeId: nodeData.meta?.label || 'unknown',
      state: currentState,
      theme: nodeData.styling?.theme || 'default',
      overrides: JSON.stringify(overrides),
      stylingHash: this._hashStylingConfig(nodeData.styling)
    };
    
    return JSON.stringify(keyData);
  }

  /**
   * Generate hash for styling configuration
   * @private
   */
  _hashStylingConfig(styling) {
    if (!styling) return 'default';
    
    // Simple hash of styling configuration
    const str = JSON.stringify(styling);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  /**
   * Initialize default theme
   * @private
   */
  _initializeDefaultTheme() {
    this.registerTheme('default', {
      container: {
        backgroundColor: '#ffffff',
        borderColor: '#d1d5db'
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        titleColor: '#1f2937'
      }
    });

    this.registerTheme('dark', {
      container: {
        backgroundColor: '#1f2937',
        borderColor: '#374151'
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        titleColor: '#f9fafb'
      }
    });

    this.registerTheme('colorful', {
      container: {
        backgroundColor: '#fef3c7',
        borderColor: '#f59e0b'
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        titleColor: '#92400e'
      }
    });
  }

  /**
   * Initialize animation presets
   * @private
   */
  _initializeAnimations() {
    this.registerAnimation('pulse', {
      keyframes: {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.7 }
      },
      duration: '2s',
      iterationCount: 'infinite'
    });

    this.registerAnimation('shake', {
      keyframes: {
        '0%, 100%': { transform: 'translateX(0)' },
        '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
        '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' }
      },
      duration: '0.5s',
      timingFunction: 'ease-in-out'
    });

    this.registerAnimation('fadeIn', {
      keyframes: {
        '0%': { opacity: 0 },
        '100%': { opacity: 1 }
      },
      duration: '0.3s',
      timingFunction: 'ease-in-out'
    });
  }
}

/**
 * Global style utilities
 */
export class StyleUtils {
  /**
   * Convert hex color to rgba
   * @param {string} hex - Hex color code
   * @param {number} alpha - Alpha value (0-1)
   * @returns {string} RGBA color string
   */
  static hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * Generate color palette from base color
   * @param {string} baseColor - Base hex color
   * @returns {Object} Color palette
   */
  static generatePalette(baseColor) {
    // Simple palette generation (could be enhanced with color theory)
    return {
      50: StyleUtils.lightenColor(baseColor, 0.95),
      100: StyleUtils.lightenColor(baseColor, 0.9),
      200: StyleUtils.lightenColor(baseColor, 0.8),
      300: StyleUtils.lightenColor(baseColor, 0.6),
      400: StyleUtils.lightenColor(baseColor, 0.4),
      500: baseColor,
      600: StyleUtils.darkenColor(baseColor, 0.1),
      700: StyleUtils.darkenColor(baseColor, 0.2),
      800: StyleUtils.darkenColor(baseColor, 0.3),
      900: StyleUtils.darkenColor(baseColor, 0.4)
    };
  }

  /**
   * Lighten color
   * @param {string} color - Hex color
   * @param {number} amount - Amount to lighten (0-1)
   * @returns {string} Lightened hex color
   */
  static lightenColor(color, amount) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(255 * amount);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  /**
   * Darken color
   * @param {string} color - Hex color
   * @param {number} amount - Amount to darken (0-1)
   * @returns {string} Darkened hex color
   */
  static darkenColor(color, amount) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(255 * amount);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
      (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
      (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
  }
}

/**
 * CSS-in-JS animation injector
 */
export class AnimationInjector {
  constructor() {
    this.injectedStyles = new Set();
  }

  /**
   * Inject CSS keyframes into document
   * @param {string} name - Animation name
   * @param {Object} keyframes - Keyframe definition
   */
  injectKeyframes(name, keyframes) {
    if (this.injectedStyles.has(name)) return;

    const style = document.createElement('style');
    const keyframeText = Object.entries(keyframes)
      .map(([key, value]) => {
        const props = Object.entries(value)
          .map(([prop, val]) => `${prop}: ${val}`)
          .join('; ');
        return `${key} { ${props} }`;
      })
      .join(' ');

    style.textContent = `@keyframes ${name} { ${keyframeText} }`;
    document.head.appendChild(style);
    this.injectedStyles.add(name);
  }

  /**
   * Remove injected animation
   * @param {string} name - Animation name
   */
  removeKeyframes(name) {
    const styles = document.head.querySelectorAll('style');
    styles.forEach(style => {
      if (style.textContent.includes(`@keyframes ${name}`)) {
        style.remove();
        this.injectedStyles.delete(name);
      }
    });
  }
}

// Global instances
export const globalStyleManager = new NodeStyleManager();
export const globalAnimationInjector = new AnimationInjector();

// Export default
export default NodeStyleManager;