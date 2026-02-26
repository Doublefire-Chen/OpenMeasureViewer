# OpenMeasureViewer
A general web based platform to help researcher have a overview about data exported from industry/lab measurement device.

# Feature
- Frontend only solution, no data transmission to server, all data processing and visualization are done locally in the browser, which means your data is safe and private.
- Plugin based architecture, which means developer can easily add new measurement device support by developing a plugin, and the platform can easily integrate the new plugin without changing the core code.
- Support multiple data format, including csv, json, excel, etc. This is based on measurement device, which means the data format is not fixed, and the platform need to be flexible enough to handle different data format.

# Technology Stack
- React Vite

# UI Design
- Equipment selection: name and image of the equipment
- Modern white background and elegent design, with a focus on simplicity and ease of use.
- Data visualization: allow user to select data range, units, and other parameters to customize the visualization, and support multiple visualization types, such as line chart, bar chart, scatter plot, etc. This should be based on data type, which means plugin specific.