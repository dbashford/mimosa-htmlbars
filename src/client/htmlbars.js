define(['exports'], function (exports) {

 'use strict';

  var Morph__splice = Array.prototype.splice;

  function Morph__ensureStartEnd(start, end) {
    if (start === null || end === null) {
      throw new Error('a fragment parent must have boundary nodes in order to detect insertion');
    }
  }

  function Morph__ensureContext(contextualElement) {
    if (!contextualElement || contextualElement.nodeType !== 1) {
      throw new Error('An element node must be provided for a contextualElement, you provided ' +
                      (contextualElement ? 'nodeType ' + contextualElement.nodeType : 'nothing'));
    }
  }

  // TODO: this is an internal API, this should be an assert
  function Morph__Morph(parent, start, end, domHelper, contextualElement) {
    if (parent.nodeType === 11) {
      Morph__ensureStartEnd(start, end);
      this.element = null;
    } else {
      this.element = parent;
    }
    this._parent = parent;
    this.start = start;
    this.end = end;
    this.domHelper = domHelper;
    Morph__ensureContext(contextualElement);
    this.contextualElement = contextualElement;
    this.escaped = true;
    this.reset();
  }

  Morph__Morph.prototype.reset = function() {
    this.text = null;
    this.owner = null;
    this.morphs = null;
    this.before = null;
    this.after = null;
  };

  Morph__Morph.prototype.parent = function () {
    if (!this.element) {
      var parent = this.start.parentNode;
      if (this._parent !== parent) {
        this._parent = parent;
      }
      if (parent.nodeType === 1) {
        this.element = parent;
      }
    }
    return this._parent;
  };

  Morph__Morph.prototype.destroy = function () {
    if (this.owner) {
      this.owner.removeMorph(this);
    } else {
      Morph__clear(this.element || this.parent(), this.start, this.end);
    }
  };

  Morph__Morph.prototype.removeMorph = function (morph) {
    var morphs = this.morphs;
    for (var i=0, l=morphs.length; i<l; i++) {
      if (morphs[i] === morph) {
        this.replace(i, 1);
        break;
      }
    }
  };

  Morph__Morph.prototype.update = function (nodeOrString) {
    this._update(this.element || this.parent(), nodeOrString);
  };

  Morph__Morph.prototype.updateNode = function (node) {
    var parent = this.element || this.parent();
    if (!node) {
      return this._updateText(parent, '');
    }
    this._updateNode(parent, node);
  };

  Morph__Morph.prototype.updateText = function (text) {
    this._updateText(this.element || this.parent(), text);
  };

  Morph__Morph.prototype.updateHTML = function (html) {
    var parent = this.element || this.parent();
    if (!html) {
      return this._updateText(parent, '');
    }
    this._updateHTML(parent, html);
  };

  Morph__Morph.prototype._update = function (parent, nodeOrString) {
    if (nodeOrString === null || nodeOrString === undefined) {
      this._updateText(parent, '');
    } else if (typeof nodeOrString === 'string') {
      if (this.escaped) {
        this._updateText(parent, nodeOrString);
      } else {
        this._updateHTML(parent, nodeOrString);
      }
    } else if (nodeOrString.nodeType) {
      this._updateNode(parent, nodeOrString);
    } else if (nodeOrString.string) { // duck typed SafeString
      this._updateHTML(parent, nodeOrString.string);
    } else {
      this._updateText(parent, nodeOrString.toString());
    }
  };

  Morph__Morph.prototype._updateNode = function (parent, node) {
    if (this.text) {
      if (node.nodeType === 3) {
        this.text.nodeValue = node.nodeValue;
        return;
      } else {
        this.text = null;
      }
    }
    var start = this.start, end = this.end;
    Morph__clear(parent, start, end);
    parent.insertBefore(node, end);
    if (this.before !== null) {
      this.before.end = start.nextSibling;
    }
    if (this.after !== null) {
      this.after.start = end.previousSibling;
    }
  };

  Morph__Morph.prototype._updateText = function (parent, text) {
    if (this.text) {
      this.text.nodeValue = text;
      return;
    }
    var node = this.domHelper.createTextNode(text);
    this.text = node;
    Morph__clear(parent, this.start, this.end);
    parent.insertBefore(node, this.end);
    if (this.before !== null) {
      this.before.end = node;
    }
    if (this.after !== null) {
      this.after.start = node;
    }
  };

  Morph__Morph.prototype._updateHTML = function (parent, html) {
    var start = this.start, end = this.end;
    Morph__clear(parent, start, end);
    this.text = null;
    var childNodes = this.domHelper.parseHTML(html, this.contextualElement);
    Morph__appendChildren(parent, end, childNodes);
    if (this.before !== null) {
      this.before.end = start.nextSibling;
    }
    if (this.after !== null) {
      this.after.start = end.previousSibling;
    }
  };

  Morph__Morph.prototype.append = function (node) {
    if (this.morphs === null) {
      this.morphs = [];
    }
    var index = this.morphs.length;
    return this.insert(index, node);
  };

  Morph__Morph.prototype.insert = function (index, node) {
    if (this.morphs === null) {
      this.morphs = [];
    }
    var parent = this.element || this.parent();
    var morphs = this.morphs;
    var before = index > 0 ? morphs[index-1] : null;
    var after  = index < morphs.length ? morphs[index] : null;
    var start  = before === null ? this.start : (before.end === null ? parent.lastChild : before.end.previousSibling);
    var end    = after === null ? this.end : (after.start === null ? parent.firstChild : after.start.nextSibling);
    var morph  = new Morph__Morph(parent, start, end, this.domHelper, this.contextualElement);

    morph.owner = this;
    morph._update(parent, node);

    if (before !== null) {
      morph.before = before;
      before.end = start.nextSibling;
      before.after = morph;
    }

    if (after !== null) {
      morph.after = after;
      after.before = morph;
      after.start = end.previousSibling;
    }

    this.morphs.splice(index, 0, morph);
    return morph;
  };

  Morph__Morph.prototype.replace = function (index, removedLength, addedNodes) {
    if (this.morphs === null) {
      this.morphs = [];
    }
    var parent = this.element || this.parent();
    var morphs = this.morphs;
    var before = index > 0 ? morphs[index-1] : null;
    var after = index+removedLength < morphs.length ? morphs[index+removedLength] : null;
    var start = before === null ? this.start : (before.end === null ? parent.lastChild : before.end.previousSibling);
    var end   = after === null ? this.end : (after.start === null ? parent.firstChild : after.start.nextSibling);
    var addedLength = addedNodes === undefined ? 0 : addedNodes.length;
    var args, i, current;

    if (removedLength > 0) {
      Morph__clear(parent, start, end);
    }

    if (addedLength === 0) {
      if (before !== null) {
        before.after = after;
        before.end = end;
      }
      if (after !== null) {
        after.before = before;
        after.start = start;
      }
      morphs.splice(index, removedLength);
      return;
    }

    args = new Array(addedLength+2);
    if (addedLength > 0) {
      for (i=0; i<addedLength; i++) {
        args[i+2] = current = new Morph__Morph(parent, start, end, this.domHelper, this.contextualElement);
        current._update(parent, addedNodes[i]);
        current.owner = this;
        if (before !== null) {
          current.before = before;
          before.end = start.nextSibling;
          before.after = current;
        }
        before = current;
        start = end === null ? parent.lastChild : end.previousSibling;
      }
      if (after !== null) {
        current.after = after;
        after.before = current;
        after.start = end.previousSibling;
      }
    }

    args[0] = index;
    args[1] = removedLength;

    Morph__splice.apply(morphs, args);
  };

  function Morph__appendChildren(parent, end, nodeList) {
    var ref = end;
    var i = nodeList.length;
    var node;

    while (i--) {
      node = nodeList[i];
      parent.insertBefore(node, ref);
      ref = node;
    }
  }

  function Morph__clear(parent, start, end) {
    var current, previous;
    if (end === null) {
      current = parent.lastChild;
    } else {
      current = end.previousSibling;
    }

    while (current !== null && current !== start) {
      previous = current.previousSibling;
      parent.removeChild(current);
      current = previous;
    }
  }

  var Morph__default = Morph__Morph;

  /* global XMLSerializer:false */
  var build_html_dom__svgHTMLIntegrationPoints = {foreignObject: 1, desc: 1, title: 1};
  var build_html_dom__svgNamespace = 'http://www.w3.org/2000/svg';

  var build_html_dom__doc = typeof document === 'undefined' ? false : document;

  // Safari does not like using innerHTML on SVG HTML integration
  // points (desc/title/foreignObject).
  var build_html_dom__needsIntegrationPointFix = build_html_dom__doc && (function(document) {
    if (document.createElementNS === undefined) {
      return;
    }
    // In FF title will not accept innerHTML.
    var testEl = document.createElementNS(build_html_dom__svgNamespace, 'title');
    testEl.innerHTML = "<div></div>";
    return testEl.childNodes.length === 0 || testEl.childNodes[0].nodeType !== 1;
  })(build_html_dom__doc);

  // Internet Explorer prior to 9 does not allow setting innerHTML if the first element
  // is a "zero-scope" element. This problem can be worked around by making
  // the first node an invisible text node. We, like Modernizr, use &shy;
  var build_html_dom__needsShy = build_html_dom__doc && (function(document) {
    var testEl = document.createElement('div');
    testEl.innerHTML = "<div></div>";
    testEl.firstChild.innerHTML = "<script><\/script>";
    return testEl.firstChild.innerHTML === '';
  })(build_html_dom__doc);

  // IE 8 (and likely earlier) likes to move whitespace preceeding
  // a script tag to appear after it. This means that we can
  // accidentally remove whitespace when updating a morph.
  var build_html_dom__movesWhitespace = build_html_dom__doc && (function(document) {
    var testEl = document.createElement('div');
    testEl.innerHTML = "Test: <script type='text/x-placeholder'><\/script>Value";
    return testEl.childNodes[0].nodeValue === 'Test:' &&
            testEl.childNodes[2].nodeValue === ' Value';
  })(build_html_dom__doc);

  // IE8 create a selected attribute where they should only
  // create a property
  var build_html_dom__createsSelectedAttribute = build_html_dom__doc && (function(document) {
    var testEl = document.createElement('div');
    testEl.innerHTML = "<select><option></option></select>";
    return testEl.childNodes[0].childNodes[0].getAttribute('selected') === 'selected';
  })(build_html_dom__doc);

  var build_html_dom__detectAutoSelectedOption;
  if (build_html_dom__createsSelectedAttribute) {
    build_html_dom__detectAutoSelectedOption = (function(){
      var detectAutoSelectedOptionRegex = /<option[^>]*selected/;
      return function detectAutoSelectedOption(select, option, html) { //jshint ignore:line
        return select.selectedIndex === 0 &&
               !detectAutoSelectedOptionRegex.test(html);
      };
    })();
  } else {
    build_html_dom__detectAutoSelectedOption = function build_html_dom__detectAutoSelectedOption(select, option, html) { //jshint ignore:line
      var selectedAttribute = option.getAttribute('selected');
      return select.selectedIndex === 0 && (
               selectedAttribute === null ||
               ( selectedAttribute !== '' && selectedAttribute.toLowerCase() !== 'selected' )
              );
    };
  }

  var build_html_dom__tagNamesRequiringInnerHTMLFix = build_html_dom__doc && (function(document) {
    var tagNamesRequiringInnerHTMLFix;
    // IE 9 and earlier don't allow us to set innerHTML on col, colgroup, frameset,
    // html, style, table, tbody, tfoot, thead, title, tr. Detect this and add
    // them to an initial list of corrected tags.
    //
    // Here we are only dealing with the ones which can have child nodes.
    //
    var tableNeedsInnerHTMLFix;
    var tableInnerHTMLTestElement = document.createElement('table');
    try {
      tableInnerHTMLTestElement.innerHTML = '<tbody></tbody>';
    } catch (e) {
    } finally {
      tableNeedsInnerHTMLFix = (tableInnerHTMLTestElement.childNodes.length === 0);
    }
    if (tableNeedsInnerHTMLFix) {
      tagNamesRequiringInnerHTMLFix = {
        colgroup: ['table'],
        table: [],
        tbody: ['table'],
        tfoot: ['table'],
        thead: ['table'],
        tr: ['table', 'tbody']
      };
    }

    // IE 8 doesn't allow setting innerHTML on a select tag. Detect this and
    // add it to the list of corrected tags.
    //
    var selectInnerHTMLTestElement = document.createElement('select');
    selectInnerHTMLTestElement.innerHTML = '<option></option>';
    if (!selectInnerHTMLTestElement.childNodes[0]) {
      tagNamesRequiringInnerHTMLFix = tagNamesRequiringInnerHTMLFix || {};
      tagNamesRequiringInnerHTMLFix.select = [];
    }
    return tagNamesRequiringInnerHTMLFix;
  })(build_html_dom__doc);

  function build_html_dom__scriptSafeInnerHTML(element, html) {
    // without a leading text node, IE will drop a leading script tag.
    html = '&shy;'+html;

    element.innerHTML = html;

    var nodes = element.childNodes;

    // Look for &shy; to remove it.
    var shyElement = nodes[0];
    while (shyElement.nodeType === 1 && !shyElement.nodeName) {
      shyElement = shyElement.firstChild;
    }
    // At this point it's the actual unicode character.
    if (shyElement.nodeType === 3 && shyElement.nodeValue.charAt(0) === "\u00AD") {
      var newValue = shyElement.nodeValue.slice(1);
      if (newValue.length) {
        shyElement.nodeValue = shyElement.nodeValue.slice(1);
      } else {
        shyElement.parentNode.removeChild(shyElement);
      }
    }

    return nodes;
  }

  function build_html_dom__buildDOMWithFix(html, contextualElement){
    var tagName = contextualElement.tagName;

    // Firefox versions < 11 do not have support for element.outerHTML.
    var outerHTML = contextualElement.outerHTML || new XMLSerializer().serializeToString(contextualElement);
    if (!outerHTML) {
      throw "Can't set innerHTML on "+tagName+" in this browser";
    }

    var wrappingTags = build_html_dom__tagNamesRequiringInnerHTMLFix[tagName.toLowerCase()];
    var startTag = outerHTML.match(new RegExp("<"+tagName+"([^>]*)>", 'i'))[0];
    var endTag = '</'+tagName+'>';

    var wrappedHTML = [startTag, html, endTag];

    var i = wrappingTags.length;
    var wrappedDepth = 1 + i;
    while(i--) {
      wrappedHTML.unshift('<'+wrappingTags[i]+'>');
      wrappedHTML.push('</'+wrappingTags[i]+'>');
    }

    var wrapper = document.createElement('div');
    build_html_dom__scriptSafeInnerHTML(wrapper, wrappedHTML.join(''));
    var element = wrapper;
    while (wrappedDepth--) {
      element = element.firstChild;
      while (element && element.nodeType !== 1) {
        element = element.nextSibling;
      }
    }
    while (element && element.tagName !== tagName) {
      element = element.nextSibling;
    }
    return element ? element.childNodes : [];
  }

  var build_html_dom__buildDOM;
  if (build_html_dom__needsShy) {
    build_html_dom__buildDOM = function build_html_dom__buildDOM(html, contextualElement, dom){
      contextualElement = dom.cloneNode(contextualElement, false);
      build_html_dom__scriptSafeInnerHTML(contextualElement, html);
      return contextualElement.childNodes;
    };
  } else {
    build_html_dom__buildDOM = function build_html_dom__buildDOM(html, contextualElement, dom){
      contextualElement = dom.cloneNode(contextualElement, false);
      contextualElement.innerHTML = html;
      return contextualElement.childNodes;
    };
  }

  var build_html_dom__buildIESafeDOM;
  if (build_html_dom__tagNamesRequiringInnerHTMLFix || build_html_dom__movesWhitespace) {
    build_html_dom__buildIESafeDOM = function build_html_dom__buildIESafeDOM(html, contextualElement, dom) {
      // Make a list of the leading text on script nodes. Include
      // script tags without any whitespace for easier processing later.
      var spacesBefore = [];
      var spacesAfter = [];
      html = html.replace(/(\s*)(<script)/g, function(match, spaces, tag) {
        spacesBefore.push(spaces);
        return tag;
      });

      html = html.replace(/(<\/script>)(\s*)/g, function(match, tag, spaces) {
        spacesAfter.push(spaces);
        return tag;
      });

      // Fetch nodes
      var nodes;
      if (build_html_dom__tagNamesRequiringInnerHTMLFix[contextualElement.tagName.toLowerCase()]) {
        // buildDOMWithFix uses string wrappers for problematic innerHTML.
        nodes = build_html_dom__buildDOMWithFix(html, contextualElement);
      } else {
        nodes = build_html_dom__buildDOM(html, contextualElement, dom);
      }

      // Build a list of script tags, the nodes themselves will be
      // mutated as we add test nodes.
      var i, j, node, nodeScriptNodes;
      var scriptNodes = [];
      for (i=0;i<nodes.length;i++) {
        node=nodes[i];
        if (node.nodeType !== 1) {
          continue;
        }
        if (node.tagName === 'SCRIPT') {
          scriptNodes.push(node);
        } else {
          nodeScriptNodes = node.getElementsByTagName('script');
          for (j=0;j<nodeScriptNodes.length;j++) {
            scriptNodes.push(nodeScriptNodes[j]);
          }
        }
      }

      // Walk the script tags and put back their leading text nodes.
      var scriptNode, textNode, spaceBefore, spaceAfter;
      for (i=0;i<scriptNodes.length;i++) {
        scriptNode = scriptNodes[i];
        spaceBefore = spacesBefore[i];
        if (spaceBefore && spaceBefore.length > 0) {
          textNode = dom.document.createTextNode(spaceBefore);
          scriptNode.parentNode.insertBefore(textNode, scriptNode);
        }

        spaceAfter = spacesAfter[i];
        if (spaceAfter && spaceAfter.length > 0) {
          textNode = dom.document.createTextNode(spaceAfter);
          scriptNode.parentNode.insertBefore(textNode, scriptNode.nextSibling);
        }
      }

      return nodes;
    };
  } else {
    build_html_dom__buildIESafeDOM = build_html_dom__buildDOM;
  }

  // When parsing innerHTML, the browser may set up DOM with some things
  // not desired. For example, with a select element context and option
  // innerHTML the first option will be marked selected.
  //
  // This method cleans up some of that, resetting those values back to
  // their defaults.
  //
  function build_html_dom__buildSafeDOM(html, contextualElement, dom) {
    var childNodes = build_html_dom__buildIESafeDOM(html, contextualElement, dom);

    if (contextualElement.tagName === 'SELECT') {
      // Walk child nodes
      for (var i = 0; childNodes[i]; i++) {
        // Find and process the first option child node
        if (childNodes[i].tagName === 'OPTION') {
          if (build_html_dom__detectAutoSelectedOption(childNodes[i].parentNode, childNodes[i], html)) {
            // If the first node is selected but does not have an attribute,
            // presume it is not really selected.
            childNodes[i].parentNode.selectedIndex = -1;
          }
          break;
        }
      }
    }

    return childNodes;
  }

  var build_html_dom__buildHTMLDOM;
  if (build_html_dom__needsIntegrationPointFix) {
    build_html_dom__buildHTMLDOM = function build_html_dom__buildHTMLDOM(html, contextualElement, dom){
      if (build_html_dom__svgHTMLIntegrationPoints[contextualElement.tagName]) {
        return build_html_dom__buildSafeDOM(html, document.createElement('div'), dom);
      } else {
        return build_html_dom__buildSafeDOM(html, contextualElement, dom);
      }
    };
  } else {
    build_html_dom__buildHTMLDOM = build_html_dom__buildSafeDOM;
  }

  var classes__doc = typeof document === 'undefined' ? false : document;

  // PhantomJS has a broken classList. See https://github.com/ariya/phantomjs/issues/12782
  var classes__canClassList = classes__doc && (function(){
    var d = document.createElement('div');
    if (!d.classList) {
      return false;
    }
    d.classList.add('boo');
    d.classList.add('boo', 'baz');
    return (d.className === 'boo baz');
  })();

  function classes__buildClassList(element) {
    var classString = (element.getAttribute('class') || '');
    return classString !== '' && classString !== ' ' ? classString.split(' ') : [];
  }

  function classes__intersect(containingArray, valuesArray) {
    var containingIndex = 0;
    var containingLength = containingArray.length;
    var valuesIndex = 0;
    var valuesLength = valuesArray.length;

    var intersection = new Array(valuesLength);

    // TODO: rewrite this loop in an optimal manner
    for (;containingIndex<containingLength;containingIndex++) {
      valuesIndex = 0;
      for (;valuesIndex<valuesLength;valuesIndex++) {
        if (valuesArray[valuesIndex] === containingArray[containingIndex]) {
          intersection[valuesIndex] = containingIndex;
          break;
        }
      }
    }

    return intersection;
  }

  function classes__addClassesViaAttribute(element, classNames) {
    var existingClasses = classes__buildClassList(element);

    var indexes = classes__intersect(existingClasses, classNames);
    var didChange = false;

    for (var i=0, l=classNames.length; i<l; i++) {
      if (indexes[i] === undefined) {
        didChange = true;
        existingClasses.push(classNames[i]);
      }
    }

    if (didChange) {
      element.setAttribute('class', existingClasses.length > 0 ? existingClasses.join(' ') : '');
    }
  }

  function classes__removeClassesViaAttribute(element, classNames) {
    var existingClasses = classes__buildClassList(element);

    var indexes = classes__intersect(classNames, existingClasses);
    var didChange = false;
    var newClasses = [];

    for (var i=0, l=existingClasses.length; i<l; i++) {
      if (indexes[i] === undefined) {
        newClasses.push(existingClasses[i]);
      } else {
        didChange = true;
      }
    }

    if (didChange) {
      element.setAttribute('class', newClasses.length > 0 ? newClasses.join(' ') : '');
    }
  }

  var classes__addClasses, classes__removeClasses;
  if (classes__canClassList) {
    classes__addClasses = function classes__addClasses(element, classNames) {
      if (element.classList) {
        if (classNames.length === 1) {
          element.classList.add(classNames[0]);
        } else if (classNames.length === 2) {
          element.classList.add(classNames[0], classNames[1]);
        } else {
          element.classList.add.apply(element.classList, classNames);
        }
      } else {
        classes__addClassesViaAttribute(element, classNames);
      }
    };
    classes__removeClasses = function classes__removeClasses(element, classNames) {
      if (element.classList) {
        if (classNames.length === 1) {
          element.classList.remove(classNames[0]);
        } else if (classNames.length === 2) {
          element.classList.remove(classNames[0], classNames[1]);
        } else {
          element.classList.remove.apply(element.classList, classNames);
        }
      } else {
        classes__removeClassesViaAttribute(element, classNames);
      }
    };
  } else {
    classes__addClasses = classes__addClassesViaAttribute;
    classes__removeClasses = classes__removeClassesViaAttribute;
  }

 /* global window:false */
 var DOMHelper__doc = typeof document === 'undefined' ? false : document;

 var DOMHelper__deletesBlankTextNodes = DOMHelper__doc && (function(document){
   var element = document.createElement('div');
   element.appendChild( document.createTextNode('') );
   var clonedElement = element.cloneNode(true);
   return clonedElement.childNodes.length === 0;
 })(DOMHelper__doc);

 var DOMHelper__ignoresCheckedAttribute = DOMHelper__doc && (function(document){
   var element = document.createElement('input');
   element.setAttribute('checked', 'checked');
   var clonedElement = element.cloneNode(false);
   return !clonedElement.checked;
 })(DOMHelper__doc);

 function DOMHelper__isSVG(ns){
   return ns === build_html_dom__svgNamespace;
 }

 // This is not the namespace of the element, but of
 // the elements inside that elements.
 function DOMHelper__interiorNamespace(element){
   if (
     element &&
     element.namespaceURI === build_html_dom__svgNamespace &&
     !build_html_dom__svgHTMLIntegrationPoints[element.tagName]
   ) {
     return build_html_dom__svgNamespace;
   } else {
     return null;
   }
 }

 // The HTML spec allows for "omitted start tags". These tags are optional
 // when their intended child is the first thing in the parent tag. For
 // example, this is a tbody start tag:
 //
 // <table>
 //   <tbody>
 //     <tr>
 //
 // The tbody may be omitted, and the browser will accept and render:
 //
 // <table>
 //   <tr>
 //
 // However, the omitted start tag will still be added to the DOM. Here
 // we test the string and context to see if the browser is about to
 // perform this cleanup.
 //
 // http://www.whatwg.org/specs/web-apps/current-work/multipage/syntax.html#optional-tags
 // describes which tags are omittable. The spec for tbody and colgroup
 // explains this behavior:
 //
 // http://www.whatwg.org/specs/web-apps/current-work/multipage/tables.html#the-tbody-element
 // http://www.whatwg.org/specs/web-apps/current-work/multipage/tables.html#the-colgroup-element
 //

 var DOMHelper__omittedStartTagChildTest = /<([\w:]+)/;
 function DOMHelper__detectOmittedStartTag(string, contextualElement){
   // Omitted start tags are only inside table tags.
   if (contextualElement.tagName === 'TABLE') {
     var omittedStartTagChildMatch = DOMHelper__omittedStartTagChildTest.exec(string);
     if (omittedStartTagChildMatch) {
       var omittedStartTagChild = omittedStartTagChildMatch[1];
       // It is already asserted that the contextual element is a table
       // and not the proper start tag. Just see if a tag was omitted.
       return omittedStartTagChild === 'tr' ||
              omittedStartTagChild === 'col';
     }
   }
 }

 function DOMHelper__buildSVGDOM(html, dom){
   var div = dom.document.createElement('div');
   div.innerHTML = '<svg>'+html+'</svg>';
   return div.firstChild.childNodes;
 }

 /*
  * A class wrapping DOM functions to address environment compatibility,
  * namespaces, contextual elements for morph un-escaped content
  * insertion.
  *
  * When entering a template, a DOMHelper should be passed:
  *
  *   template(context, { hooks: hooks, dom: new DOMHelper() });
  *
  * TODO: support foreignObject as a passed contextual element. It has
  * a namespace (svg) that does not match its internal namespace
  * (xhtml).
  *
  * @class DOMHelper
  * @constructor
  * @param {HTMLDocument} _document The document DOM methods are proxied to
  */
 function DOMHelper__DOMHelper(_document){
   this.document = _document || window.document;
   this.namespace = null;
 }

 var DOMHelper__prototype = DOMHelper__DOMHelper.prototype;
 DOMHelper__prototype.constructor = DOMHelper__DOMHelper;

 DOMHelper__prototype.insertBefore = function(element, childElement, referenceChild) {
   return element.insertBefore(childElement, referenceChild);
 };

 DOMHelper__prototype.appendChild = function(element, childElement) {
   return element.appendChild(childElement);
 };

 DOMHelper__prototype.appendText = function(element, text) {
   return element.appendChild(this.document.createTextNode(text));
 };

 DOMHelper__prototype.setAttribute = function(element, name, value) {
   element.setAttribute(name, value);
 };

 DOMHelper__prototype.removeAttribute = function(element, name) {
   element.removeAttribute(name);
 };

 DOMHelper__prototype.setProperty = function(element, name, value) {
   element[name] = value;
 };

 if (DOMHelper__doc && DOMHelper__doc.createElementNS) {
   // Only opt into namespace detection if a contextualElement
   // is passed.
   DOMHelper__prototype.createElement = function(tagName, contextualElement) {
     var namespace = this.namespace;
     if (contextualElement) {
       if (tagName === 'svg') {
         namespace = build_html_dom__svgNamespace;
       } else {
         namespace = DOMHelper__interiorNamespace(contextualElement);
       }
     }
     if (namespace) {
       return this.document.createElementNS(namespace, tagName);
     } else {
       return this.document.createElement(tagName);
     }
   };
 } else {
   DOMHelper__prototype.createElement = function(tagName) {
     return this.document.createElement(tagName);
   };
 }

 DOMHelper__prototype.addClasses = classes__addClasses;
 DOMHelper__prototype.removeClasses = classes__removeClasses;

 DOMHelper__prototype.setNamespace = function(ns) {
   this.namespace = ns;
 };

 DOMHelper__prototype.detectNamespace = function(element) {
   this.namespace = DOMHelper__interiorNamespace(element);
 };

 DOMHelper__prototype.createDocumentFragment = function(){
   return this.document.createDocumentFragment();
 };

 DOMHelper__prototype.createTextNode = function(text){
   return this.document.createTextNode(text);
 };

 DOMHelper__prototype.createComment = function(text){
   return this.document.createComment(text);
 };

 DOMHelper__prototype.repairClonedNode = function(element, blankChildTextNodes, isChecked){
   if (DOMHelper__deletesBlankTextNodes && blankChildTextNodes.length > 0) {
     for (var i=0, len=blankChildTextNodes.length;i<len;i++){
       var textNode = this.document.createTextNode(''),
           offset = blankChildTextNodes[i],
           before = element.childNodes[offset];
       if (before) {
         element.insertBefore(textNode, before);
       } else {
         element.appendChild(textNode);
       }
     }
   }
   if (DOMHelper__ignoresCheckedAttribute && isChecked) {
     element.setAttribute('checked', 'checked');
   }
 };

 DOMHelper__prototype.cloneNode = function(element, deep){
   var clone = element.cloneNode(!!deep);
   return clone;
 };

 DOMHelper__prototype.createMorph = function(parent, start, end, contextualElement){
   if (!contextualElement && parent.nodeType === 1) {
     contextualElement = parent;
   }
   return new Morph__default(parent, start, end, this, contextualElement);
 };

 DOMHelper__prototype.createUnsafeMorph = function(parent, start, end, contextualElement){
   var morph = this.createMorph(parent, start, end, contextualElement);
   morph.escaped = false;
   return morph;
 };

 // This helper is just to keep the templates good looking,
 // passing integers instead of element references.
 DOMHelper__prototype.createMorphAt = function(parent, startIndex, endIndex, contextualElement){
   var childNodes = parent.childNodes,
       start = startIndex === -1 ? null : childNodes[startIndex],
       end = endIndex === -1 ? null : childNodes[endIndex];
   return this.createMorph(parent, start, end, contextualElement);
 };

 DOMHelper__prototype.createUnsafeMorphAt = function(parent, startIndex, endIndex, contextualElement) {
   var morph = this.createMorphAt(parent, startIndex, endIndex, contextualElement);
   morph.escaped = false;
   return morph;
 };

 DOMHelper__prototype.insertMorphBefore = function(element, referenceChild, contextualElement) {
   var start = this.document.createTextNode('');
   var end = this.document.createTextNode('');
   element.insertBefore(start, referenceChild);
   element.insertBefore(end, referenceChild);
   return this.createMorph(element, start, end, contextualElement);
 };

 DOMHelper__prototype.appendMorph = function(element, contextualElement) {
   var start = this.document.createTextNode('');
   var end = this.document.createTextNode('');
   element.appendChild(start);
   element.appendChild(end);
   return this.createMorph(element, start, end, contextualElement);
 };

 DOMHelper__prototype.parseHTML = function(html, contextualElement) {
   var isSVGContent = (
     DOMHelper__isSVG(this.namespace) &&
     !build_html_dom__svgHTMLIntegrationPoints[contextualElement.tagName]
   );

   if (isSVGContent) {
     return DOMHelper__buildSVGDOM(html, this);
   } else {
     var nodes = build_html_dom__buildHTMLDOM(html, contextualElement, this);
     if (DOMHelper__detectOmittedStartTag(html, contextualElement)) {
       var node = nodes[0];
       while (node && node.nodeType !== 1) {
         node = node.nextSibling;
       }
       return node.childNodes;
     } else {
       return nodes;
     }
   }
 };

 var DOMHelper__default = DOMHelper__DOMHelper;



  function helpers__concat(params) {
    var value = "";
    for (var i = 0, l = params.length; i < l; i++) {
      value += params[i];
    }
    return value;
  }

  function helpers__partial(params, hash, options, env) {
    var template = env.partials[params[0]];
    return template.render(this, env, options.morph.contextualElement);
  }

  var helpers__default = {
    concat: helpers__concat,
    partial: helpers__partial
  };

  function hooks__content(morph, path, context, params, hash, options, env) {
    var value, helper = hooks__lookupHelper(context, path, env);
    if (helper) {
      value = helper.call(context, params, hash, options, env);
    } else {
      value = hooks__get(context, path);
    }
    morph.update(value);
  }

  function hooks__element(domElement, helperName, context, params, hash, options, env) {
    var helper = hooks__lookupHelper(context, helperName, env);
    if (helper) {
      helper.call(context, params, hash, options, env);
    }
  }

  function hooks__attribute(domElement, attributeName, quoted, context, parts, options) {
    var attrValue;

    if (quoted) {
      attrValue = helpers__concat.call(context, parts, null, options);
    } else {
      attrValue = parts[0];
    }

    if (attrValue === null) {
      domElement.removeAttribute(attributeName);
    } else {
      domElement.setAttribute(attributeName, attrValue);
    }
  }

  function hooks__subexpr(helperName, context, params, hash, options, env) {
    var helper = hooks__lookupHelper(context, helperName, env);
    if (helper) {
      return helper.call(context, params, hash, options, env);
    } else {
      return hooks__get(context, helperName, options);
    }
  }

  function hooks__get(context, path) {
    if (path === '') {
      return context;
    }

    var keys = path.split('.');
    var value = context;
    for (var i = 0; i < keys.length; i++) {
      if (value) {
        value = value[keys[i]];
      } else {
        break;
      }
    }
    return value;
  }

  function hooks__set(context, name, value) {
    context[name] = value;
  }

  function hooks__component(morph, tagName, context, hash, options, env) {
    var value, helper = hooks__lookupHelper(context, tagName, env);
    if (helper) {
      value = helper.call(context, null, hash, options, env);
    } else {
      value = hooks__componentFallback(morph, tagName, context, hash, options, env);
    }
    morph.update(value);
  }

  function hooks__componentFallback(morph, tagName, context, hash, options, env) {
    var element = env.dom.createElement(tagName);
    for (var name in hash) {
      element.setAttribute(name, hash[name]);
    }
    element.appendChild(options.template.render(context, env, morph.contextualElement));
    return element;
  }

  function hooks__lookupHelper(context, helperName, env) {
    return env.helpers[helperName];
  }

  var hooks__default = {
    content: hooks__content,
    component: hooks__component,
    element: hooks__element,
    attribute: hooks__attribute,
    subexpr: hooks__subexpr,
    get: hooks__get,
    set: hooks__set
  };

 (function (__export) {
  __export('hooks', function () { return hooks__default; });
 __export('helpers', function () { return helpers__default; });
 __export('Morph', function () { return Morph__default; });
 __export('DOMHelper', function () { return DOMHelper__default; });
 }(function (prop, get) {
  Object.defineProperty(exports, prop, {
   enumerable: true,
   get: get
  });
 }));

});