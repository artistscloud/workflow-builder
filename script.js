document.addEventListener('DOMContentLoaded', function() {
    // Initialize the workflow builder
    const WorkflowBuilder = {
        init() {
            this.canvas = document.getElementById('workflow-canvas');
            this.propertiesPanel = document.getElementById('properties-panel');
            this.nodeCounter = 0;
            this.nodes = {};
            this.selectedNode = null;
            this.jsPlumbInstance = this.initJsPlumb();
            this.registerEventListeners();
            this.setupCategoryTabs();
        },

        // Setup category tabs 
        setupCategoryTabs() {
            const tabs = document.querySelectorAll('.category-tab');
            
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // Remove active class from all tabs
                    tabs.forEach(t => t.classList.remove('active'));
                    
                    // Add active class to clicked tab
                    tab.classList.add('active');
                    
                    // Show corresponding node grid
                    const category = tab.dataset.category;
                    document.querySelectorAll('.node-grid').forEach(grid => {
                        if (grid.dataset.category === category) {
                            grid.style.display = 'flex';
                        } else {
                            grid.style.display = 'none';
                        }
                    });
                });
            });
        },

        initJsPlumb() {
            const instance = jsPlumb.getInstance({
                Connector: ["Bezier", { curviness: 60 }],
                Endpoint: ["Dot", { radius: 5 }],
                EndpointStyle: { fill: "#6366F1" },
                PaintStyle: { stroke: "#6366F1", strokeWidth: 2 },
                HoverPaintStyle: { stroke: "#4F46E5", strokeWidth: 3 },
                ConnectionOverlays: [
                    ["Arrow", { width: 10, length: 10, location: 1 }]
                ],
                Container: "workflow-canvas"
            });
            
            // Default settings for connection
            instance.registerConnectionType("default", {
                anchor: ["Left", "Right"],
                connector: ["Bezier", { curviness: 60 }],
                paintStyle: { stroke: "#6366F1", strokeWidth: 2 },
                hoverPaintStyle: { stroke: "#4F46E5", strokeWidth: 3 },
                overlays: [
                    ["Arrow", { width: 10, length: 10, location: 1 }]
                ]
            });

            return instance;
        },

        registerEventListeners() {
            // Drag nodes from palette to canvas
            document.querySelectorAll('.node-card').forEach(nodeCard => {
                nodeCard.addEventListener('mousedown', this.handleNodeItemMouseDown.bind(this));
            });

            // New workflow button
            document.getElementById('new-workflow').addEventListener('click', this.clearWorkflow.bind(this));
            
            // Save workflow button
            document.getElementById('save-workflow').addEventListener('click', this.saveWorkflow.bind(this));
            
            // Run workflow button
            document.getElementById('run-workflow').addEventListener('click', this.runWorkflow.bind(this));

            // Canvas click handler to deselect nodes
            this.canvas.addEventListener('click', (e) => {
                if (e.target === this.canvas) {
                    this.deselectNode();
                }
            });

            // Node search
            document.getElementById('node-search').addEventListener('input', this.handleNodeSearch.bind(this));
        },

        handleNodeItemMouseDown(e) {
            const nodeType = e.currentTarget.dataset.type;
            
            // Create a ghost node for dragging
            const ghost = e.currentTarget.cloneNode(true);
            ghost.style.position = 'absolute';
            ghost.style.zIndex = '1000';
            ghost.style.opacity = '0.7';
            ghost.style.pointerEvents = 'none';
            document.body.appendChild(ghost);
            
            // Position at mouse cursor
            ghost.style.left = `${e.clientX - ghost.offsetWidth / 2}px`;
            ghost.style.top = `${e.clientY - ghost.offsetHeight / 2}px`;
            
            // Move ghost with mouse
            const handleMouseMove = (moveEvent) => {
                ghost.style.left = `${moveEvent.clientX - ghost.offsetWidth / 2}px`;
                ghost.style.top = `${moveEvent.clientY - ghost.offsetHeight / 2}px`;
            };
            
            const handleMouseUp = (upEvent) => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.body.removeChild(ghost);
                
                // Check if mouse was released over the canvas
                const canvasRect = this.canvas.getBoundingClientRect();
                if (
                    upEvent.clientX >= canvasRect.left && 
                    upEvent.clientX <= canvasRect.right && 
                    upEvent.clientY >= canvasRect.top && 
                    upEvent.clientY <= canvasRect.bottom
                ) {
                    // Get position relative to canvas, accounting for scroll
                    const x = upEvent.clientX - canvasRect.left + this.canvas.scrollLeft;
                    const y = upEvent.clientY - canvasRect.top + this.canvas.scrollTop;
                    
                    // Create the actual node
                    this.createNode(nodeType, x, y);
                }
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        },

        createNode(type, x, y) {
            const nodeId = `node-${++this.nodeCounter}`;
            const nodeTemplate = document.getElementById('node-template').content.cloneNode(true);
            const nodeElement = nodeTemplate.querySelector('.workflow-node');
            
            nodeElement.id = nodeId;
            nodeElement.dataset.type = type;
            nodeElement.style.left = `${x}px`;
            nodeElement.style.top = `${y}px`;
            
            // Setup node based on type
            const nodeConfig = this.getNodeConfigByType(type);
            nodeElement.querySelector('.node-title').textContent = nodeConfig.title;
            
            // Create the node body content
            const nodeBody = nodeElement.querySelector('.node-body');
            nodeBody.innerHTML = nodeConfig.bodyTemplate || '';
            
            // Create input ports
            const inputPortsContainer = nodeElement.querySelector('.input-ports');
            if (nodeConfig.inputs && nodeConfig.inputs.length > 0) {
                nodeConfig.inputs.forEach(input => {
                    const portGroup = document.createElement('div');
                    portGroup.className = 'input-port-group';
                    
                    const port = document.createElement('div');
                    port.className = 'port input-port';
                    port.dataset.portId = input.id;
                    port.dataset.portType = input.type;
                    
                    const label = document.createElement('span');
                    label.className = 'port-label';
                    label.textContent = input.label;
                    
                    portGroup.appendChild(port);
                    portGroup.appendChild(label);
                    inputPortsContainer.appendChild(portGroup);
                });
            }
            
            // Create output ports
            const outputPortsContainer = nodeElement.querySelector('.output-ports');
            if (nodeConfig.outputs && nodeConfig.outputs.length > 0) {
                nodeConfig.outputs.forEach(output => {
                    const portGroup = document.createElement('div');
                    portGroup.className = 'output-port-group';
                    
                    const label = document.createElement('span');
                    label.className = 'port-label';
                    label.textContent = output.label;
                    
                    const port = document.createElement('div');
                    port.className = 'port output-port';
                    port.dataset.portId = output.id;
                    port.dataset.portType = output.type;
                    
                    portGroup.appendChild(label);
                    portGroup.appendChild(port);
                    outputPortsContainer.appendChild(portGroup);
                });
            }
            
            // Add node to canvas
            this.canvas.appendChild(nodeElement);
            
            // Store node configuration
            this.nodes[nodeId] = {
                id: nodeId,
                type: type,
                config: { ...nodeConfig.defaultConfig },
                position: { x, y }
            };
            
            // Setup event listeners
            this.setupNodeEventListeners(nodeElement);
            
            // Setup jsPlumb endpoints
            this.setupJsPlumbEndpoints(nodeId);
            
            // Select the new node
            this.selectNode(nodeId);
            
            return nodeId;
        },
        
        setupNodeEventListeners(nodeElement) {
            // Node selection
            nodeElement.addEventListener('click', (e) => {
                if (!e.target.classList.contains('node-delete-btn')) {
                    e.stopPropagation();
                    this.selectNode(nodeElement.id);
                }
            });
            
            // Delete button
            const deleteBtn = nodeElement.querySelector('.node-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteNode(nodeElement.id);
            });
            
            // Make node draggable
            this.jsPlumbInstance.draggable(nodeElement, {
                start: () => {
                    this.selectNode(nodeElement.id);
                },
                stop: (e) => {
                    // Update stored position
                    this.nodes[nodeElement.id].position = {
                        x: parseInt(nodeElement.style.left),
                        y: parseInt(nodeElement.style.top)
                    };
                }
            });
        },
        
        setupJsPlumbEndpoints(nodeId) {
            const nodeElement = document.getElementById(nodeId);
            const nodeConfig = this.getNodeConfigByType(nodeElement.dataset.type);
            
            // Input endpoints
            const inputPorts = nodeElement.querySelectorAll('.input-port');
            inputPorts.forEach(port => {
                this.jsPlumbInstance.makeTarget(port, {
                    anchor: "Left",
                    maxConnections: 1,
                    dropOptions: { hoverClass: "port-hover" }
                });
            });
            
            // Output endpoints
            const outputPorts = nodeElement.querySelectorAll('.output-port');
            outputPorts.forEach(port => {
                this.jsPlumbInstance.makeSource(port, {
                    anchor: "Right",
                    connectionType: "default",
                    maxConnections: -1, // Unlimited connections
                    isSource: true
                });
            });
            
            // Handle connections
            this.jsPlumbInstance.bind("connection", (info) => {
                // Check if connection is valid (output to input)
                const sourcePort = info.source;
                const targetPort = info.target;
                
                if (!sourcePort.classList.contains('output-port') || !targetPort.classList.contains('input-port')) {
                    this.jsPlumbInstance.deleteConnection(info.connection);
                    return;
                }
                
                // Check if port types are compatible
                const sourceType = sourcePort.dataset.portType;
                const targetType = targetPort.dataset.portType;
                
                if (sourceType !== targetType && sourceType !== 'any' && targetType !== 'any') {
                    this.jsPlumbInstance.deleteConnection(info.connection);
                    alert(`Incompatible connection: ${sourceType} cannot connect to ${targetType}`);
                    return;
                }
                
                // Check if target already has a connection
                const connections = this.jsPlumbInstance.getConnections({
                    target: targetPort
                });
                
                if (connections.length > 1) {
                    this.jsPlumbInstance.deleteConnection(info.connection);
                    alert("Input ports can only have one connection");
                    return;
                }
            });
            
            // Allow deletion of connections
            this.jsPlumbInstance.bind("click", (connection) => {
                if (confirm("Delete this connection?")) {
                    this.jsPlumbInstance.deleteConnection(connection);
                }
            });
        },
        
        selectNode(nodeId) {
            // Deselect previous node
            if (this.selectedNode) {
                const prevNode = document.getElementById(this.selectedNode);
                if (prevNode) {
                    prevNode.classList.remove('selected');
                }
            }
            
            this.selectedNode = nodeId;
            const nodeElement = document.getElementById(nodeId);
            nodeElement.classList.add('selected');
            
            // Show node properties
            this.showNodeProperties(nodeId);
        },
        
        deselectNode() {
            if (this.selectedNode) {
                const node = document.getElementById(this.selectedNode);
                if (node) {
                    node.classList.remove('selected');
                }
                this.selectedNode = null;
                
                // Clear properties panel
                this.propertiesPanel.querySelector('.properties-content').innerHTML = 
                    '<div class="placeholder-message">Select a node to view its properties</div>';
            }
        },
        
        deleteNode(nodeId) {
            if (confirm("Are you sure you want to delete this node?")) {
                // Remove connections
                this.jsPlumbInstance.remove(nodeId);
                
                // Remove from DOM
                const nodeElement = document.getElementById(nodeId);
                if (nodeElement) {
                    this.canvas.removeChild(nodeElement);
                }
                
                // Remove from nodes store
                delete this.nodes[nodeId];
                
                // If the deleted node was selected, clear the properties panel
                if (this.selectedNode === nodeId) {
                    this.deselectNode();
                }
            }
        },
        
        showNodeProperties(nodeId) {
            const node = this.nodes[nodeId];
            const nodeConfig = this.getNodeConfigByType(node.type);
            const propertiesContent = this.propertiesPanel.querySelector('.properties-content');
            
            // Clear previous content
            propertiesContent.innerHTML = '';
            
            // Create form for node properties
            const form = document.createElement('form');
            form.className = 'node-properties-form';
            
            // Add title display
            const titleDisplay = document.createElement('div');
            titleDisplay.className = 'properties-title';
            titleDisplay.innerHTML = `<h3>${nodeConfig.title}</h3>`;
            if (nodeConfig.description) {
                titleDisplay.innerHTML += `<p class="properties-description">${nodeConfig.description}</p>`;
            }
            form.appendChild(titleDisplay);
            
            // Add form fields based on node type
            if (nodeConfig.properties && nodeConfig.properties.length > 0) {
                nodeConfig.properties.forEach(prop => {
                    const formGroup = document.createElement('div');
                    formGroup.className = 'form-group';
                    
                    const label = document.createElement('label');
                    label.className = 'form-label';
                    label.textContent = prop.label;
                    label.setAttribute('for', `${nodeId}-${prop.id}`);
                    
                    let input;
                    switch (prop.type) {
                        case 'text':
                            input = document.createElement('input');
                            input.type = 'text';
                            input.className = 'form-input';
                            break;
                        case 'number':
                            input = document.createElement('input');
                            input.type = 'number';
                            input.className = 'form-input';
                            if (prop.min !== undefined) input.min = prop.min;
                            if (prop.max !== undefined) input.max = prop.max;
                            break;
                        case 'select':
                            input = document.createElement('select');
                            input.className = 'form-select';
                            if (prop.options) {
                                prop.options.forEach(option => {
                                    const optionElement = document.createElement('option');
                                    optionElement.value = option.value;
                                    optionElement.textContent = option.label;
                                    input.appendChild(optionElement);
                                });
                            }
                            break;
                        case 'checkbox':
                            input = document.createElement('input');
                            input.type = 'checkbox';
                            input.className = 'form-checkbox';
                            break;
                        case 'textarea':
                            input = document.createElement('textarea');
                            input.className = 'form-textarea';
                            if (prop.rows) input.rows = prop.rows;
                            break;
                        default:
                            input = document.createElement('input');
                            input.type = 'text';
                            input.className = 'form-input';
                    }
                    
                    input.id = `${nodeId}-${prop.id}`;
                    input.name = prop.id;
                    
                    // Set current value
                    if (node.config && node.config[prop.id] !== undefined) {
                        if (prop.type === 'checkbox') {
                            input.checked = node.config[prop.id];
                        } else {
                            input.value = node.config[prop.id];
                        }
                    } else if (prop.default !== undefined) {
                        if (prop.type === 'checkbox') {
                            input.checked = prop.default;
                        } else {
                            input.value = prop.default;
                        }
                    }
                    
                    // Handle input changes
                    input.addEventListener('change', (e) => {
                        const value = prop.type === 'checkbox' ? e.target.checked : e.target.value;
                        node.config[prop.id] = value;
                        
                        // Update node visuals if needed
                        this.updateNodeVisuals(nodeId);
                    });
                    
                    formGroup.appendChild(label);
                    formGroup.appendChild(input);
                    
                    if (prop.help) {
                        const helpText = document.createElement('div');
                        helpText.className = 'form-help';
                        helpText.textContent = prop.help;
                        formGroup.appendChild(helpText);
                    }
                    
                    form.appendChild(formGroup);
                });
            }
            
            propertiesContent.appendChild(form);
        },
        
        updateNodeVisuals(nodeId) {
            const node = this.nodes[nodeId];
            const nodeElement = document.getElementById(nodeId);
            
            // Update any visual aspects of the node based on its configuration
            const nodeConfig = this.getNodeConfigByType(node.type);
            
            // Example: update node title if there's a name property
            if (node.config.name) {
                const titleElement = nodeElement.querySelector('.node-title');
                titleElement.textContent = node.config.name;
            }
            
            // Example: update node body content based on configuration
            if (nodeConfig.updateVisuals) {
                nodeConfig.updateVisuals(nodeElement, node.config);
            }
        },
        
        getNodeConfigByType(type) {
            // Default node configurations
            const nodeConfigs = {
                input: {
                    title: 'Input',
                    description: 'Pass data of different types into your workflow',
                    inputs: [],
                    outputs: [
                        { id: 'text', label: 'Text', type: 'string' }
                    ],
                    properties: [
                        { id: 'name', label: 'Node Name', type: 'text', default: 'Input' },
                        { id: 'type', label: 'Type', type: 'select', options: [
                            { value: 'text', label: 'Text' },
                            { value: 'file', label: 'File' },
                            { value: 'audio', label: 'Audio' }
                        ], default: 'text' }
                    ],
                    defaultConfig: {
                        name: 'Input',
                        type: 'text'
                    },
                    bodyTemplate: `
                        <div class="node-info">
                            <div class="node-id">input_0</div>
                            <div class="node-type-selector">
                                <div class="type-label">Type <i class="fas fa-circle-info"></i></div>
                                <div class="type-value">Text</div>
                            </div>
                        </div>
                    `,
                    updateVisuals: (element, config) => {
                        const typeDisplay = element.querySelector('.type-value');
                        if (typeDisplay) {
                            typeDisplay.textContent = config.type ? config.type.charAt(0).toUpperCase() + config.type.slice(1) : 'Text';
                        }
                        
                        // Update outputs based on type
                        const node = element.closest('.workflow-node');
                        if (node) {
                            const nodeId = node.id;
                            const outputsContainer = node.querySelector('.output-ports');
                            outputsContainer.innerHTML = ''; // Clear existing outputs
                            
                            if (config.type === 'text') {
                                // Add text output
                                const portGroup = document.createElement('div');
                                portGroup.className = 'output-port-group';
                                
                                const label = document.createElement('span');
                                label.className = 'port-label';
                                label.textContent = 'Text';
                                
                                const port = document.createElement('div');
                                port.className = 'port output-port';
                                port.dataset.portId = 'text';
                                port.dataset.portType = 'string';
                                
                                portGroup.appendChild(label);
                                portGroup.appendChild(port);
                                outputsContainer.appendChild(portGroup);
                            } else if (config.type === 'file') {
                                // Add processed_text output
                                const textPortGroup = document.createElement('div');
                                textPortGroup.className = 'output-port-group';
                                
                                const textLabel = document.createElement('span');
                                textLabel.className = 'port-label';
                                textLabel.textContent = 'Processed Text';
                                
                                const textPort = document.createElement('div');
                                textPort.className = 'port output-port';
                                textPort.dataset.portId = 'processed_text';
                                textPort.dataset.portType = 'string';
                                
                                textPortGroup.appendChild(textLabel);
                                textPortGroup.appendChild(textPort);
                                outputsContainer.appendChild(textPortGroup);
                                
                                // Add file output
                                const filePortGroup = document.createElement('div');
                                filePortGroup.className = 'output-port-group';
                                
                                const fileLabel = document.createElement('span');
                                fileLabel.className = 'port-label';
                                fileLabel.textContent = 'File';
                                
                                const filePort = document.createElement('div');
                                filePort.className = 'port output-port';
                                filePort.dataset.portId = 'file';
                                filePort.dataset.portType = 'file';
                                
                                filePortGroup.appendChild(fileLabel);
                                filePortGroup.appendChild(filePort);
                                outputsContainer.appendChild(filePortGroup);
                            } else if (config.type === 'audio') {
                                // Add audio output
                                const portGroup = document.createElement('div');
                                portGroup.className = 'output-port-group';
                                
                                const label = document.createElement('span');
                                label.className = 'port-label';
                                label.textContent = 'Audio';
                                
                                const port = document.createElement('div');
                                port.className = 'port output-port';
                                port.dataset.portId = 'audio';
                                port.dataset.portType = 'audio';
                                
                                portGroup.appendChild(label);
                                portGroup.appendChild(port);
                                outputsContainer.appendChild(portGroup);
                            }
                            
                            // Refresh jsPlumb endpoints
                            WorkflowBuilder.jsPlumbInstance.repaintEverything();
                        }
                    }
                },
                output: {
                    title: 'Output',
                    description: 'Output data of different types from your workflow',
                    inputs: [
                        { id: 'output', label: 'Output', type: 'any' }
                    ],
                    outputs: [],
                    properties: [
                        { id: 'name', label: 'Node Name', type: 'text', default: 'Output' },
                        { id: 'type', label: 'Type', type: 'select', options: [
                            { value: 'text', label: 'Text' },
                            { value: 'streamed_text', label: 'Streamed Text' },
                            { value: 'file', label: 'File' },
                            { value: 'image', label: 'Image' },
                            { value: 'audio', label: 'Audio' },
                            { value: 'json', label: 'JSON' }
                        ], default: 'text' },
                        { id: 'outputField', label: 'Output', type: 'text', required: true },
                        { id: 'formatOutput', label: 'Format Output', type: 'checkbox', default: true }
                    ],
                    defaultConfig: {
                        name: 'Output',
                        type: 'text',
                        outputField: '',
                        formatOutput: true
                    },
                    bodyTemplate: `
                        <div class="node-info">
                            <div class="node-id">output_1</div>
                            <div class="node-type-selector">
                                <div class="type-label">Type <i class="fas fa-circle-info"></i></div>
                                <div class="type-value">Text</div>
                            </div>
                            <div class="output-field-container">
                                <div class="output-field-label">Output <span class="required">*</span></div>
                                <div class="output-field-input">
                                    <input type="text" placeholder="Type {{" to utilize variables">
                                </div>
                            </div>
                            <div class="format-output-container">
                                <div class="format-output-label">Format output</div>
                                <div class="format-output-toggle">
                                    <div class="toggle-switch enabled"></div>
                                </div>
                            </div>
                        </div>
                        <div class="error-message">Output field is required</div>
                    `,
                    updateVisuals: (element, config) => {
                        const typeDisplay = element.querySelector('.type-value');
                        if (typeDisplay) {
                            // Map type values to display values
                            const typeMap = {
                                'text': 'Text',
                                'streamed_text': 'Streamed Text',
                                'file': 'File',
                                'image': 'Image',
                                'audio': 'Audio',
                                'json': 'JSON'
                            };
                            typeDisplay.textContent = typeMap[config.type] || 'Text';
                        }
                        
                        // Update output field
                        const outputInput = element.querySelector('.output-field-input input');
                        if (outputInput) {
                            outputInput.value = config.outputField || '';
                        }
                        
                        // Update format toggle
                        const formatToggle = element.querySelector('.toggle-switch');
                        if (formatToggle) {
                            if (config.formatOutput) {
                                formatToggle.classList.add('enabled');
                                formatToggle.classList.remove('disabled');
                            } else {
                                formatToggle.classList.add('disabled');
                                formatToggle.classList.remove('enabled');
                            }
                        }
                        
                        // Show/hide error message
                        const errorMessage = element.querySelector('.error-message');
                        if (errorMessage) {
                            if (!config.outputField) {
                                errorMessage.style.display = 'block';
                            } else {
                                errorMessage.style.display = 'none';
                            }
                        }
                        
                        // Update input port types based on selected output type
                        const node = element.closest('.workflow-node');
                        if (node) {
                            const nodeId = node.id;
                            const inputPortContainer = node.querySelector('.input-ports');
                            if (inputPortContainer) {
                                const inputPorts = inputPortContainer.querySelectorAll('.input-port');
                                inputPorts.forEach(port => {
                                    port.dataset.portType = config.type;
                                });
                            }
                        }
                    }
                },
                textInput: {
                    title: 'Text Input',
                    description: 'Provides text input to the workflow',
                    inputs: [],
                    outputs: [
                        { id: 'text', label: 'Text', type: 'string' }
                    ],
                    properties: [
                        { id: 'name', label: 'Node Name', type: 'text', default: 'Text Input' },
                        { id: 'defaultValue', label: 'Default Value', type: 'text' },
                        { id: 'placeholder', label: 'Placeholder', type: 'text' },
                        { id: 'required', label: 'Required', type: 'checkbox', default: false }
                    ],
                    defaultConfig: {
                        name: 'Text Input',
                        defaultValue: '',
                        placeholder: 'Enter text...',
                        required: false
                    },
                    bodyTemplate: `
                        <div class="form-group">
                            <input type="text" class="form-input node-text-input" placeholder="Enter text...">
                        </div>
                    `,
                    updateVisuals: (element, config) => {
                        const input = element.querySelector('.node-text-input');
                        if (input) {
                            input.placeholder = config.placeholder || 'Enter text...';
                            input.value = config.defaultValue || '';
                        }
                    }
                },
                fileInput: {
                    title: 'File Upload',
                    description: 'Allows uploading files to the workflow',
                    inputs: [],
                    outputs: [
                        { id: 'file', label: 'File', type: 'file' }
                    ],
                    properties: [
                        { id: 'name', label: 'Node Name', type: 'text', default: 'File Upload' },
                        { id: 'acceptTypes', label: 'Accept File Types', type: 'text', help: 'e.g. .jpg,.png,image/*' },
                        { id: 'multiple', label: 'Allow Multiple Files', type: 'checkbox', default: false }
                    ],
                    defaultConfig: {
                        name: 'File Upload',
                        acceptTypes: '',
                        multiple: false
                    },
                    bodyTemplate: `
                        <div class="form-group">
                            <button class="btn upload-btn">Choose File</button>
                            <div class="file-info">No file selected</div>
                        </div>
                    `
                },
                apiInput: {
                    title: 'API Request',
                    description: 'Fetches data from an API endpoint',
                    inputs: [],
                    outputs: [
                        { id: 'data', label: 'Data', type: 'any' }
                    ],
                    properties: [
                        { id: 'name', label: 'Node Name', type: 'text', default: 'API Request' },
                        { id: 'url', label: 'API URL', type: 'text' },
                        { id: 'method', label: 'Method', type: 'select', options: [
                            { value: 'GET', label: 'GET' },
                            { value: 'POST', label: 'POST' },
                            { value: 'PUT', label: 'PUT' },
                            { value: 'DELETE', label: 'DELETE' }
                        ], default: 'GET' },
                        { id: 'headers', label: 'Headers (JSON)', type: 'textarea' },
                        { id: 'body', label: 'Request Body (JSON)', type: 'textarea' }
                    ],
                    defaultConfig: {
                        name: 'API Request',
                        url: '',
                        method: 'GET',
                        headers: '{}',
                        body: '{}'
                    },
                    bodyTemplate: `
                        <div class="api-info">
                            <div class="api-method">GET</div>
                            <div class="api-url-display">https://api.example.com</div>
                        </div>
                    `,
                    updateVisuals: (element, config) => {
                        const methodDisplay = element.querySelector('.api-method');
                        const urlDisplay = element.querySelector('.api-url-display');
                        if (methodDisplay) {
                            methodDisplay.textContent = config.method || 'GET';
                        }
                        if (urlDisplay) {
                            urlDisplay.textContent = config.url || 'https://api.example.com';
                        }
                    }
                },
                textProcessor: {
                    title: 'Text Processor',
                    description: 'Performs operations on text data',
                    inputs: [
                        { id: 'text', label: 'Text', type: 'string' }
                    ],
                    outputs: [
                        { id: 'result', label: 'Result', type: 'string' }
                    ],
                    properties: [
                        { id: 'name', label: 'Node Name', type: 'text', default: 'Text Processor' },
                        { id: 'operation', label: 'Operation', type: 'select', options: [
                            { value: 'toUpperCase', label: 'To Upper Case' },
                            { value: 'toLowerCase', label: 'To Lower Case' },
                            { value: 'trim', label: 'Trim Whitespace' },
                            { value: 'replace', label: 'Replace Text' }
                        ] },
                        { id: 'findText', label: 'Find Text', type: 'text', 
                          conditional: (config) => config.operation === 'replace' },
                        { id: 'replaceWith', label: 'Replace With', type: 'text',
                          conditional: (config) => config.operation === 'replace' }
                    ],
                    defaultConfig: {
                        name: 'Text Processor',
                        operation: 'toUpperCase',
                        findText: '',
                        replaceWith: ''
                    },
                    bodyTemplate: `
                        <div class="processor-info">
                            <div>Operation: <span class="operation-display">To Upper Case</span></div>
                        </div>
                    `,
                    updateVisuals: (element, config) => {
                        const opDisplay = element.querySelector('.operation-display');
                        if (opDisplay) {
                            const opMap = {
                                'toUpperCase': 'To Upper Case',
                                'toLowerCase': 'To Lower Case',
                                'trim': 'Trim Whitespace',
                                'replace': 'Replace Text'
                            };
                            opDisplay.textContent = opMap[config.operation] || 'To Upper Case';
                        }
                    }
                },
                filter: {
                    title: 'Filter',
                    description: 'Filters data based on conditions',
                    inputs: [
                        { id: 'data', label: 'Data', type: 'any' }
                    ],
                    outputs: [
                        { id: 'filtered', label: 'Filtered', type: 'any' }
                    ],
                    properties: [
                        { id: 'name', label: 'Node Name', type: 'text', default: 'Filter' },
                        { id: 'condition', label: 'Filter Condition', type: 'textarea', rows: 3, 
                          help: 'JavaScript expression to filter data items. Use "item" variable, e.g., item.id > 10' }
                    ],
                    defaultConfig: {
                        name: 'Filter',
                        condition: 'true'
                    }
                },
                transformer: {
                    title: 'Transformer',
                    description: 'Transforms data using custom code',
                    inputs: [
                        { id: 'data', label: 'Data', type: 'any' }
                    ],
                    outputs: [
                        { id: 'result', label: 'Result', type: 'any' }
                    ],
                    properties: [
                        { id: 'name', label: 'Node Name', type: 'text', default: 'Transformer' },
                        { id: 'transformation', label: 'Transformation Code', type: 'textarea', rows: 6, 
                          help: 'JavaScript code to transform input. Use "input" variable and return result.' }
                    ],
                    defaultConfig: {
                        name: 'Transformer',
                        transformation: 'return input;'
                    }
                },
                display: {
                    title: 'Display Results',
                    description: 'Shows data in the workflow',
                    inputs: [
                        { id: 'data', label: 'Data', type: 'any' }
                    ],
                    outputs: [],
                    properties: [
                        { id: 'name', label: 'Node Name', type: 'text', default: 'Display Results' },
                        { id: 'displayFormat', label: 'Display Format', type: 'select', options: [
                            { value: 'text', label: 'Text' },
                            { value: 'json', label: 'JSON' },
                            { value: 'table', label: 'Table' }
                        ] }
                    ],
                    defaultConfig: {
                        name: 'Display Results',
                        displayFormat: 'text'
                    },
                    bodyTemplate: `
                        <div class="display-container">
                            <div class="display-placeholder">No data to display</div>
                        </div>
                    `
                },
                fileExport: {
                    title: 'Export to File',
                    description: 'Exports data to a downloadable file',
                    inputs: [
                        { id: 'data', label: 'Data', type: 'any' }
                    ],
                    outputs: [],
                    properties: [
                        { id: 'name', label: 'Node Name', type: 'text', default: 'Export to File' },
                        { id: 'fileName', label: 'File Name', type: 'text', default: 'export.txt' },
                        { id: 'fileType', label: 'File Type', type: 'select', options: [
                            { value: 'text', label: 'Text (.txt)' },
                            { value: 'json', label: 'JSON (.json)' },
                            { value: 'csv', label: 'CSV (.csv)' }
                        ] }
                    ],
                    defaultConfig: {
                        name: 'Export to File',
                        fileName: 'export.txt',
                        fileType: 'text'
                    },
                    bodyTemplate: `
                        <div class="export-info">
                            <div>File: <span class="file-name-display">export.txt</span></div>
                            <button class="btn download-btn" disabled>Download</button>
                        </div>
                    `,
                    updateVisuals: (element, config) => {
                        const fileNameDisplay = element.querySelector('.file-name-display');
                        if (fileNameDisplay) {
                            fileNameDisplay.textContent = config.fileName || 'export.txt';
                        }
                    }
                },
                apiOutput: {
                    title: 'API Post',
                    description: 'Sends data to an API endpoint',
                    inputs: [
                        { id: 'data', label: 'Data', type: 'any' }
                    ],
                    outputs: [
                        { id: 'response', label: 'Response', type: 'any' }
                    ],
                    properties: [
                        { id: 'name', label: 'Node Name', type: 'text', default: 'API Post' },
                        { id: 'url', label: 'API URL', type: 'text' },
                        { id: 'method', label: 'Method', type: 'select', options: [
                            { value: 'POST', label: 'POST' },
                            { value: 'PUT', label: 'PUT' },
                            { value: 'PATCH', label: 'PATCH' }
                        ], default: 'POST' },
                        { id: 'headers', label: 'Headers (JSON)', type: 'textarea' }
                    ],
                    defaultConfig: {
                        name: 'API Post',
                        url: '',
                        method: 'POST',
                        headers: '{}'
                    },
                    bodyTemplate: `
                        <div class="api-info">
                            <div class="api-method">POST</div>
                            <div class="api-url-display">https://api.example.com</div>
                        </div>
                    `,
                    updateVisuals: (element, config) => {
                        const methodDisplay = element.querySelector('.api-method');
                        const urlDisplay = element.querySelector('.api-url-display');
                        if (methodDisplay) {
                            methodDisplay.textContent = config.method || 'POST';
                        }
                        if (urlDisplay) {
                            urlDisplay.textContent = config.url || 'https://api.example.com';
                        }
                    }
                },
                openai: {
                    title: 'OpenAI',
                    description: 'Use OpenAI language models to generate text',
                    inputs: [
                        { id: 'prompt', label: 'Prompt', type: 'string' }
                    ],
                    outputs: [
                        { id: 'response', label: 'Response', type: 'string' },
                        { id: 'tokens_used', label: 'Tokens Used', type: 'number' },
                        { id: 'input_tokens', label: 'Input Tokens', type: 'number' },
                        { id: 'output_tokens', label: 'Output Tokens', type: 'number' },
                        { id: 'credits_used', label: 'Credits Used', type: 'number' }
                    ],
                    properties: [
                        { id: 'name', label: 'Node Name', type: 'text', default: 'OpenAI' },
                        { id: 'provider', label: 'Provider', type: 'select', options: [
                            { value: 'openai', label: 'OpenAI' },
                            { value: 'azure', label: 'Azure OpenAI' },
                            { value: 'anthropic', label: 'Anthropic' },
                            { value: 'google', label: 'Google' }
                        ], default: 'openai' },
                        { id: 'model', label: 'Model', type: 'select', options: [
                            { value: 'gpt-4', label: 'GPT-4' },
                            { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                            { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
                        ], default: 'gpt-3.5-turbo' },
                        { id: 'maxTokens', label: 'Max Tokens', type: 'number', default: 1000, min: 50, max: 4000 },
                        { id: 'temperature', label: 'Temperature', type: 'number', default: 0.7, min: 0, max: 2, step: 0.1 },
                        { id: 'topP', label: 'Top P', type: 'number', default: 1, min: 0, max: 1, step: 0.01 },
                        { id: 'streamResponse', label: 'Stream Response', type: 'checkbox', default: false },
                        { id: 'jsonOutput', label: 'JSON Output', type: 'checkbox', default: false },
                        { id: 'showSources', label: 'Show Sources', type: 'checkbox', default: false },
                        { id: 'showConfidence', label: 'Show Confidence', type: 'checkbox', default: false },
                        { id: 'toxicInputFiltration', label: 'Toxic Input Filtration', type: 'checkbox', default: true },
                        { id: 'detectPII', label: 'Detect PII', type: 'checkbox', default: true }
                    ],
                    defaultConfig: {
                        name: 'OpenAI',
                        provider: 'openai',
                        model: 'gpt-3.5-turbo',
                        maxTokens: 1000,
                        temperature: 0.7,
                        topP: 1,
                        streamResponse: false,
                        jsonOutput: false,
                        showSources: false,
                        showConfidence: false,
                        toxicInputFiltration: true,
                        detectPII: true
                    },
                    bodyTemplate: `
                        <div class="node-info">
                            <div class="node-id">openai_0</div>
                            <div class="model-selector">
                                <div class="model-label">Model <i class="fas fa-circle-info"></i></div>
                                <div class="model-value">gpt-3.5-turbo</div>
                            </div>
                        </div>
                    `,
                    updateVisuals: (element, config) => {
                        const modelDisplay = element.querySelector('.model-value');
                        if (modelDisplay) {
                            modelDisplay.textContent = config.model || 'gpt-3.5-turbo';
                        }
                    }
                },
                anthropic: {
                    title: 'Anthropic',
                    description: 'Use Anthropic Claude language models',
                    inputs: [
                        { id: 'prompt', label: 'Prompt', type: 'string' }
                    ],
                    outputs: [
                        { id: 'response', label: 'Response', type: 'string' },
                        { id: 'tokens_used', label: 'Tokens Used', type: 'number' },
                        { id: 'input_tokens', label: 'Input Tokens', type: 'number' },
                        { id: 'output_tokens', label: 'Output Tokens', type: 'number' },
                        { id: 'credits_used', label: 'Credits Used', type: 'number' }
                    ],
                    properties: [
                        { id: 'name', label: 'Node Name', type: 'text', default: 'Anthropic' },
                        { id: 'model', label: 'Model', type: 'select', options: [
                            { value: 'claude-3-opus', label: 'Claude 3 Opus' },
                            { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
                            { value: 'claude-3-haiku', label: 'Claude 3 Haiku' }
                        ], default: 'claude-3-haiku' },
                        { id: 'maxTokens', label: 'Max Tokens', type: 'number', default: 1000, min: 50, max: 4000 },
                        { id: 'temperature', label: 'Temperature', type: 'number', default: 0.7, min: 0, max: 1, step: 0.1 },
                        { id: 'topP', label: 'Top P', type: 'number', default: 1, min: 0, max: 1, step: 0.01 },
                        { id: 'streamResponse', label: 'Stream Response', type: 'checkbox', default: false },
                        { id: 'jsonOutput', label: 'JSON Output', type: 'checkbox', default: false },
                        { id: 'showSources', label: 'Show Sources', type: 'checkbox', default: false },
                        { id: 'showConfidence', label: 'Show Confidence', type: 'checkbox', default: false },
                        { id: 'toxicInputFiltration', label: 'Toxic Input Filtration', type: 'checkbox', default: true },
                        { id: 'detectPII', label: 'Detect PII', type: 'checkbox', default: true }
                    ],
                    defaultConfig: {
                        name: 'Anthropic',
                        model: 'claude-3-haiku',
                        maxTokens: 1000,
                        temperature: 0.7,
                        topP: 1,
                        streamResponse: false,
                        jsonOutput: false,
                        showSources: false,
                        showConfidence: false,
                        toxicInputFiltration: true,
                        detectPII: true
                    },
                    bodyTemplate: `
                        <div class="node-info">
                            <div class="node-id">anthropic_0</div>
                            <div class="model-selector">
                                <div class="model-label">Model <i class="fas fa-circle-info"></i></div>
                                <div class="model-value">claude-3-haiku</div>
                            </div>
                        </div>
                    `,
                    updateVisuals: (element, config) => {
                        const modelDisplay = element.querySelector('.model-value');
                        if (modelDisplay) {
                            modelDisplay.textContent = config.model || 'claude-3-haiku';
                        }
                    }
                },
                cohere: {
                    title: 'Cohere',
                    description: 'Use Cohere language models',
                    inputs: [
                        { id: 'prompt', label: 'Prompt', type: 'string' }
                    ],
                    outputs: [
                        { id: 'response', label: 'Response', type: 'string' },
                        { id: 'tokens_used', label: 'Tokens Used', type: 'number' },
                        { id: 'input_tokens', label: 'Input Tokens', type: 'number' },
                        { id: 'output_tokens', label: 'Output Tokens', type: 'number' },
                        { id: 'credits_used', label: 'Credits Used', type: 'number' }
                    ],
                    properties: [
                        { id: 'name', label: 'Node Name', type: 'text', default: 'Cohere' },
                        { id: 'model', label: 'Model', type: 'select', options: [
                            { value: 'command-r', label: 'Command R' },
                            { value: 'command-r-plus', label: 'Command R+' }
                        ], default: 'command-r' },
                        { id: 'maxTokens', label: 'Max Tokens', type: 'number', default: 1000, min: 50, max: 4000 },
                        { id: 'temperature', label: 'Temperature', type: 'number', default: 0.7, min: 0, max: 1, step: 0.1 },
                        { id: 'topP', label: 'Top P', type: 'number', default: 1, min: 0, max: 1, step: 0.01 },
                        { id: 'streamResponse', label: 'Stream Response', type: 'checkbox', default: false },
                        { id: 'jsonOutput', label: 'JSON Output', type: 'checkbox', default: false },
                        { id: 'toxicInputFiltration', label: 'Toxic Input Filtration', type: 'checkbox', default: true },
                        { id: 'detectPII', label: 'Detect PII', type: 'checkbox', default: true }
                    ],
                    defaultConfig: {
                        name: 'Cohere',
                        model: 'command-r',
                        maxTokens: 1000,
                        temperature: 0.7,
                        topP: 1,
                        streamResponse: false,
                        jsonOutput: false,
                        toxicInputFiltration: true,
                        detectPII: true
                    },
                    bodyTemplate: `
                        <div class="node-info">
                            <div class="node-id">cohere_0</div>
                            <div class="model-selector">
                                <div class="model-label">Model <i class="fas fa-circle-info"></i></div>
                                <div class="model-value">command-r</div>
                            </div>
                        </div>
                    `,
                    updateVisuals: (element, config) => {
                        const modelDisplay = element.querySelector('.model-value');
                        if (modelDisplay) {
                            modelDisplay.textContent = config.model || 'command-r';
                        }
                    }
                },
                google: {
                    title: 'Google',
                    description: 'Use Google Gemini language models',
                    inputs: [
                        { id: 'prompt', label: 'Prompt', type: 'string' }
                    ],
                    outputs: [
                        { id: 'response', label: 'Response', type: 'string' },
                        { id: 'tokens_used', label: 'Tokens Used', type: 'number' },
                        { id: 'input_tokens', label: 'Input Tokens', type: 'number' },
                        { id: 'output_tokens', label: 'Output Tokens', type: 'number' },
                        { id: 'credits_used', label: 'Credits Used', type: 'number' }
                    ],
                    properties: [
                        { id: 'name', label: 'Node Name', type: 'text', default: 'Google' },
                        { id: 'model', label: 'Model', type: 'select', options: [
                            { value: 'gemini-pro', label: 'Gemini Pro' },
                            { value: 'gemini-ultra', label: 'Gemini Ultra' }
                        ], default: 'gemini-pro' },
                        { id: 'maxTokens', label: 'Max Tokens', type: 'number', default: 1000, min: 50, max: 4000 },
                        { id: 'temperature', label: 'Temperature', type: 'number', default: 0.7, min: 0, max: 1, step: 0.1 },
                        { id: 'topP', label: 'Top P', type: 'number', default: 1, min: 0, max: 1, step: 0.01 },
                        { id: 'streamResponse', label: 'Stream Response', type: 'checkbox', default: false },
                        { id: 'jsonOutput', label: 'JSON Output', type: 'checkbox', default: false },
                        { id: 'showSources', label: 'Show Sources', type: 'checkbox', default: false },
                        { id: 'toxicInputFiltration', label: 'Toxic Input Filtration', type: 'checkbox', default: true },
                        { id: 'detectPII', label: 'Detect PII', type: 'checkbox', default: true }
                    ],
                    defaultConfig: {
                        name: 'Google',
                        model: 'gemini-pro',
                        maxTokens: 1000,
                        temperature: 0.7,
                        topP: 1,
                        streamResponse: false,
                        jsonOutput: false,
                        showSources: false,
                        toxicInputFiltration: true,
                        detectPII: true
                    },
                    bodyTemplate: `
                        <div class="node-info">
                            <div class="node-id">google_0</div>
                            <div class="model-selector">
                                <div class="model-label">Model <i class="fas fa-circle-info"></i></div>
                                <div class="model-value">gemini-pro</div>
                            </div>
                        </div>
                    `,
                    updateVisuals: (element, config) => {
                        const modelDisplay = element.querySelector('.model-value');
                        if (modelDisplay) {
                            modelDisplay.textContent = config.model || 'gemini-pro';
                        }
                    }
                },
                azure: {
                    title: 'Azure OpenAI',
                    description: 'Use Azure OpenAI language models',
                    inputs: [
                        { id: 'prompt', label: 'Prompt', type: 'string' }
                    ],
                    outputs: [
                        { id: 'response', label: 'Response', type: 'string' },
                        { id: 'tokens_used', label: 'Tokens Used', type: 'number' },
                        { id: 'input_tokens', label: 'Input Tokens', type: 'number' },
                        { id: 'output_tokens', label: 'Output Tokens', type: 'number' },
                        { id: 'credits_used', label: 'Credits Used', type: 'number' }
                    ],
                    properties: [
                        { id: 'name', label: 'Node Name', type: 'text', default: 'Azure OpenAI' },
                        { id: 'model', label: 'Model', type: 'select', options: [
                            { value: 'gpt-4', label: 'GPT-4' },
                            { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
                        ], default: 'gpt-3.5-turbo' },
                        { id: 'deploymentName', label: 'Deployment Name', type: 'text' },
                        { id: 'maxTokens', label: 'Max Tokens', type: 'number', default: 1000, min: 50, max: 4000 },
                        { id: 'temperature', label: 'Temperature', type: 'number', default: 0.7, min: 0, max: 1, step: 0.1 },
                        { id: 'topP', label: 'Top P', type: 'number', default: 1, min: 0, max: 1, step: 0.01 },
                        { id: 'streamResponse', label: 'Stream Response', type: 'checkbox', default: false },
                        { id: 'jsonOutput', label: 'JSON Output', type: 'checkbox', default: false },
                        { id: 'showSources', label: 'Show Sources', type: 'checkbox', default: false },
                        { id: 'showConfidence', label: 'Show Confidence', type: 'checkbox', default: false },
                        { id: 'toxicInputFiltration', label: 'Toxic Input Filtration', type: 'checkbox', default: true },
                        { id: 'detectPII', label: 'Detect PII', type: 'checkbox', default: true }
                    ],
                    defaultConfig: {
                        name: 'Azure OpenAI',
                        model: 'gpt-3.5-turbo',
                        deploymentName: '',
                        maxTokens: 1000,
                        temperature: 0.7,
                        topP: 1,
                        streamResponse: false,
                        jsonOutput: false,
                        showSources: false,
                        showConfidence: false,
                        toxicInputFiltration: true,
                        detectPII: true
                    },
                    bodyTemplate: `
                        <div class="node-info">
                            <div class="node-id">azure_0</div>
                            <div class="model-selector">
                                <div class="model-label">Model <i class="fas fa-circle-info"></i></div>
                                <div class="model-value">gpt-3.5-turbo</div>
                            </div>
                        </div>
                    `,
                    updateVisuals: (element, config) => {
                        const modelDisplay = element.querySelector('.model-value');
                        if (modelDisplay) {
                            modelDisplay.textContent = config.model || 'gpt-3.5-turbo';
                        }
                    }
                }
            };
            
            return nodeConfigs[type] || {
                title: 'Unknown Node',
                inputs: [],
                outputs: [],
                properties: [],
                defaultConfig: {}
            };
        },
        
        clearWorkflow() {
            if (confirm("Are you sure you want to clear the entire workflow?")) {
                // Remove all nodes
                this.jsPlumbInstance.reset();
                this.canvas.innerHTML = '';
                this.nodes = {};
                this.nodeCounter = 0;
                this.selectedNode = null;
                
                // Clear properties panel
                this.propertiesPanel.querySelector('.properties-content').innerHTML = 
                    '<div class="placeholder-message">Select a node to view its properties</div>';
            }
        },
        
        saveWorkflow() {
            // Get all connections
            const connections = this.jsPlumbInstance.getConnections().map(conn => {
                const sourceEl = conn.source;
                const targetEl = conn.target;
                const sourceNode = sourceEl.closest('.workflow-node').id;
                const targetNode = targetEl.closest('.workflow-node').id;
                return {
                    sourceNode,
                    sourcePort: sourceEl.dataset.portId,
                    targetNode,
                    targetPort: targetEl.dataset.portId
                };
            });
            
            // Create workflow object
            const workflow = {
                nodes: this.nodes,
                connections: connections
            };
            
            // Convert to JSON and save
            const json = JSON.stringify(workflow, null, 2);
            
            // Create a blob and download link
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'workflow.json';
            link.click();
            
            // Clean up
            URL.revokeObjectURL(url);
        },
        
        loadWorkflow(json) {
            try {
                // Clear existing workflow
                this.clearWorkflow();
                
                // Parse workflow data
                const workflow = JSON.parse(json);
                
                // Create nodes
                for (const nodeId in workflow.nodes) {
                    const node = workflow.nodes[nodeId];
                    
                    // Create node template
                    const nodeTemplate = document.getElementById('node-template').content.cloneNode(true);
                    const nodeElement = nodeTemplate.querySelector('.workflow-node');
                    
                    nodeElement.id = nodeId;
                    nodeElement.dataset.type = node.type;
                    nodeElement.style.left = `${node.position.x}px`;
                    nodeElement.style.top = `${node.position.y}px`;
                    
                    // Setup node based on type
                    const nodeConfig = this.getNodeConfigByType(node.type);
                    nodeElement.querySelector('.node-title').textContent = node.config.name || nodeConfig.title;
                    
                    // Create the node body content
                    const nodeBody = nodeElement.querySelector('.node-body');
                    nodeBody.innerHTML = nodeConfig.bodyTemplate || '';
                    
                    // Create input ports
                    const inputPortsContainer = nodeElement.querySelector('.input-ports');
                    if (nodeConfig.inputs && nodeConfig.inputs.length > 0) {
                        nodeConfig.inputs.forEach(input => {
                            const portGroup = document.createElement('div');
                            portGroup.className = 'input-port-group';
                            
                            const port = document.createElement('div');
                            port.className = 'port input-port';
                            port.dataset.portId = input.id;
                            port.dataset.portType = input.type;
                            
                            const label = document.createElement('span');
                            label.className = 'port-label';
                            label.textContent = input.label;
                            
                            portGroup.appendChild(port);
                            portGroup.appendChild(label);
                            inputPortsContainer.appendChild(portGroup);
                        });
                    }
                    
                    // Create output ports
                    const outputPortsContainer = nodeElement.querySelector('.output-ports');
                    if (nodeConfig.outputs && nodeConfig.outputs.length > 0) {
                        nodeConfig.outputs.forEach(output => {
                            const portGroup = document.createElement('div');
                            portGroup.className = 'output-port-group';
                            
                            const label = document.createElement('span');
                            label.className = 'port-label';
                            label.textContent = output.label;
                            
                            const port = document.createElement('div');
                            port.className = 'port output-port';
                            port.dataset.portId = output.id;
                            port.dataset.portType = output.type;
                            
                            portGroup.appendChild(label);
                            portGroup.appendChild(port);
                            outputPortsContainer.appendChild(portGroup);
                        });
                    }
                    
                    // Add node to canvas
                    this.canvas.appendChild(nodeElement);
                    
                    // Store node configuration
                    this.nodes[nodeId] = node;
                    
                    // Setup event listeners
                    this.setupNodeEventListeners(nodeElement);
                    
                    // Setup jsPlumb endpoints
                    this.setupJsPlumbEndpoints(nodeId);
                    
                    // Update node visuals
                    this.updateNodeVisuals(nodeId);
                    
                    // Update node counter
                    const counter = parseInt(nodeId.replace('node-', ''));
                    if (counter > this.nodeCounter) {
                        this.nodeCounter = counter;
                    }
                }
                
                // Create connections (in a separate step after all nodes are created)
                setTimeout(() => {
                    workflow.connections.forEach(conn => {
                        const sourceNode = document.getElementById(conn.sourceNode);
                        const targetNode = document.getElementById(conn.targetNode);
                        
                        if (sourceNode && targetNode) {
                            const sourcePort = sourceNode.querySelector(`.output-port[data-port-id="${conn.sourcePort}"]`);
                            const targetPort = targetNode.querySelector(`.input-port[data-port-id="${conn.targetPort}"]`);
                            
                            if (sourcePort && targetPort) {
                                this.jsPlumbInstance.connect({
                                    source: sourcePort,
                                    target: targetPort,
                                    type: 'default'
                                });
                            }
                        }
                    });
                }, 100);
                
                return true;
            } catch (error) {
                console.error('Error loading workflow:', error);
                alert(`Error loading workflow: ${error.message}`);
                return false;
            }
        },
        
        runWorkflow() {
            alert("Workflow execution would happen here. This functionality would involve evaluating the graph of nodes and executing each node's logic in the proper order.");
            
            // In a real implementation, this would:
            // 1. Topologically sort the nodes based on connections
            // 2. Execute each node in order, passing data through the connections
            // 3. Handle errors and display results
        },
        
        handleNodeSearch(e) {
            const searchTerm = e.target.value.toLowerCase();
            const nodeCards = document.querySelectorAll('.node-card');
            
            nodeCards.forEach(card => {
                const text = card.textContent.toLowerCase();
                if (text.includes(searchTerm)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
            
            // If no cards in active category match, show message
            const activeCategory = document.querySelector('.category-tab.active').dataset.category;
            const activeGrid = document.querySelector(`.node-grid[data-category="${activeCategory}"]`);
            const visibleCards = activeGrid.querySelectorAll('.node-card[style*="display: flex"]');
            
            if (visibleCards.length === 0 && searchTerm) {
                // Could add a "no results" message here
            }
        },
        
    };
    
    // Initialize the workflow builder
    WorkflowBuilder.init();
    
    // Add to window for debugging
    window.WorkflowBuilder = WorkflowBuilder;
});
