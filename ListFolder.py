import os

def write_structure(root_path, skip_folders=None, output_file="structure.txt"):
    skip_folders = set(skip_folders or [])

    def _write(dir_path, f, prefix=""):
        entries = []
        for entry in sorted(os.listdir(dir_path)):
            if entry in skip_folders:
                continue
            entries.append(entry)
        for i, entry in enumerate(entries):
            full_path = os.path.join(dir_path, entry)
            is_last = i == len(entries) - 1
            branch = "└── " if is_last else "├── "
            if os.path.isdir(full_path):
                f.write(f"{prefix}{branch}{entry}/\n")
                _write(
                    full_path,
                    f,
                    prefix + ("    " if is_last else "│   ")
                )
            else:
                f.write(f"{prefix}{branch}{entry}\n")

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(f"{os.path.basename(os.path.abspath(root_path))}/\n")
        _write(root_path, f)

# Example usage:
if __name__ == "__main__":
    root_dir = "."  # path ที่ต้องการ
    skip = ["node_modules", ".git", "__pycache__"]
    write_structure(root_dir, skip_folders=skip)
    print("Done! See structure.txt")
