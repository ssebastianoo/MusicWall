import SwiftUI
import AppKit

struct ContentView: View {
    @State private var username: String = ""
    @State private var isSettingWallpaper = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 20) {
            TextField("Enter username", text: $username)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .padding()

            if let errorMessage = errorMessage {
                Text("Error: \(errorMessage)")
                    .foregroundColor(.red)
                    .padding()
            }

            Button(action: setWallpaper) {
                Text(isSettingWallpaper ? "Setting..." : "Set Wallpaper")
                    .frame(minWidth: 120, minHeight: 44)
                    .background(isSettingWallpaper ? Color.gray : Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
            }
            .disabled(isSettingWallpaper)
        }
        .padding()
    }

    private func setWallpaper() {
        isSettingWallpaper = true
        errorMessage = nil

        guard !username.isEmpty else {
            errorMessage = "Username cannot be empty"
            isSettingWallpaper = false
            return
        }
        
        let urlString = "https://musicwall.gir8.it/?username=\(username)"
        print(urlString)
        guard let url = URL(string: urlString) else {
            errorMessage = "Invalid URL"
            isSettingWallpaper = false
            return
        }

        let task = URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let error = error {
                    self.errorMessage = error.localizedDescription
                    self.isSettingWallpaper = false
                    return
                }

                guard let data = data, let image = NSImage(data: data) else {
                    self.errorMessage = "Failed to load image"
                    self.isSettingWallpaper = false
                    return
                }

                do {
                    let fileManager = FileManager.default
                    let tempDirectory = fileManager.temporaryDirectory
                    let timestamp = Int(Date().timeIntervalSince1970)
                    let tempFileURL = tempDirectory.appendingPathComponent("wallpaper_\(timestamp).jpg")

                    if fileManager.fileExists(atPath: tempFileURL.path) {
                        try fileManager.removeItem(at: tempFileURL)
                    }

                    try data.write(to: tempFileURL)

                    let workspace = NSWorkspace.shared
                    let screens = NSScreen.screens

                    for screen in screens {
                        try workspace.setDesktopImageURL(tempFileURL, for: screen, options: [:])
                    }
                } catch {
                    self.errorMessage = "Failed to set wallpaper: \(error.localizedDescription)"
                }

                self.isSettingWallpaper = false
            }
        }

        task.resume()
    }
}

struct WallpaperApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
