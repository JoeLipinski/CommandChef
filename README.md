# CyberCommandChef

A powerful, interactive tool for building and managing cybersecurity commands with a visual interface. Create, customize, and chain together security tools like nmap, curl, dig, and more.

## Features

- **Drag & Drop Interface**: Easily build command chains by dragging tools into your workspace
- **Dynamic Options**: Configure command parameters with text inputs, checkboxes, and select dropdowns
- **Command Variants**: Pre-configured command templates for common use cases
- **Smart Select Options**: Select dropdowns with descriptive labels and precise values
- **Export/Import**: Save and share your command configurations
- **Real-time Preview**: See your complete command string as you build it

## Select Options with Labels and Values

One of the key features of CyberCommandChef is the enhanced select dropdown system that supports both display labels and actual command values. This allows for user-friendly interfaces while maintaining precise command generation.

### How It Works

When creating or editing commands with select options, you can define choices in two ways:

1. **Simple format**: `choice1, choice2, choice3` - Uses the same text for both label and value
2. **Label:Value format**: `Display Label:actual_value, Another Label:value2` - Shows descriptive labels but uses specific values in commands

### Examples

**DNS Record Types (dig command)**:

- Display: "A Record", "MX Record", "TXT Record"
- Command values: "A", "MX", "TXT"
- Format: `A Record:A, MX Record:MX, TXT Record:TXT`

**Nmap Timing Templates**:

- Display: "Paranoid (0)", "Normal (3)", "Aggressive (4)"
- Command values: "0", "3", "4"
- Format: `Paranoid (0):0, Normal (3):3, Aggressive (4):4`

**HTTP Methods (curl command)**:

- Display: "GET Request", "POST Request", "DELETE Request"
- Command values: "GET", "POST", "DELETE"
- Format: `GET Request:GET, POST Request:POST, DELETE Request:DELETE`

### Benefits

- **User-Friendly**: Descriptive labels help users understand what each option does
- **Precise Commands**: Exact values ensure commands are generated correctly
- **Backwards Compatibility**: Simple string choices still work for basic use cases
- **Professional Interface**: Clean, intuitive dropdowns improve user experience

## Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Getting Started

```bash
# Clone the repository
git clone <repository-url>
cd CyberCommandChef

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Project Structure

```
src/
├── CommandForm.tsx          # Command creation/editing interface
├── CommandManagerModal.tsx  # Command library management
├── OptionalRow.tsx          # Individual parameter configuration
├── defaultCommands.ts       # Built-in command definitions
└── ...
```

### Creating Custom Commands

Commands are defined with a rich schema supporting various parameter types:

```typescript
{
  id: "example-command",
  category: "Example Category",
  label: "Example Tool",
  template: "example {{target}} {{flag}}",
  options: [
    {
      name: "target",
      label: "Target Host",
      type: "text",
      required: true
    },
    {
      name: "scan_type",
      label: "Scan Type",
      type: "select",
      required: false,
      flag: "-s",
      choices: [
        { label: "TCP SYN Scan", value: "S" },
        { label: "UDP Scan", value: "U" },
        { label: "Connect Scan", value: "T" }
      ]
    }
  ]
}
```

## Contributing

Contributions are welcome! Please feel free to submit pull requests with new commands, features, or improvements.
