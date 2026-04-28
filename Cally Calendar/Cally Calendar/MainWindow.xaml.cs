using System;
using System.IO;
using Microsoft.UI.Xaml;
using System.Runtime.InteropServices;
using WinRT.Interop;

namespace Cally_Calendar
{
    public sealed partial class MainWindow : Window
    {
        // Minimum size constants
        private const int MIN_WIDTH = 1000;
        private const int MIN_HEIGHT = 700;

        // Win32 interop
        private delegate IntPtr WndProcDelegate(IntPtr hwnd, uint msg, IntPtr wParam, IntPtr lParam);
        private WndProcDelegate _wndProcDelegate;
        private IntPtr _originalWndProc;

        [DllImport("user32.dll")]
        private static extern IntPtr SetWindowLongPtr(IntPtr hWnd, int nIndex, WndProcDelegate newProc);

        [DllImport("user32.dll")]
        private static extern IntPtr CallWindowProc(IntPtr lpPrevWndFunc, IntPtr hwnd, uint msg, IntPtr wParam, IntPtr lParam);

        private const int GWLP_WNDPROC = -4;
        private const uint WM_GETMINMAXINFO = 0x0024;

        [StructLayout(LayoutKind.Sequential)]
        private struct POINT { public int X, Y; }

        [StructLayout(LayoutKind.Sequential)]
        private struct MINMAXINFO
        {
            public POINT ptReserved, ptMaxSize, ptMaxPosition, ptMinTrackSize, ptMaxTrackSize;
        }

        public MainWindow()
        {
            this.InitializeComponent();
            SetMinimumSize();
            LoadCalendar();
            var appWindow = this.AppWindow;
            appWindow.Resize(new Windows.Graphics.SizeInt32(1700, 800));

        }
        private void SetMinimumSize()
        {
            IntPtr hwnd = WindowNative.GetWindowHandle(this);
            _wndProcDelegate = CustomWndProc;
            _originalWndProc = SetWindowLongPtr(hwnd, GWLP_WNDPROC, _wndProcDelegate);
        }

        private IntPtr CustomWndProc(IntPtr hwnd, uint msg, IntPtr wParam, IntPtr lParam)
        {
            if (msg == WM_GETMINMAXINFO)
            {
                var mmi = Marshal.PtrToStructure<MINMAXINFO>(lParam);
                mmi.ptMinTrackSize.X = MIN_WIDTH;
                mmi.ptMinTrackSize.Y = MIN_HEIGHT;
                Marshal.StructureToPtr(mmi, lParam, false);
            }
            return CallWindowProc(_originalWndProc, hwnd, msg, wParam, lParam);
        }
        private async void LoadCalendar()
        {
            // Initialize WebView2
            await CalendarWebView.EnsureCoreWebView2Async();

            // Build absolute path to calendar.html
            string htmlPath = Path.Combine(
            AppContext.BaseDirectory,
            "Assets",
            "Calendar",
            "calendar.html"); // Change if inside subfolder

            // Convert to proper file URI
            var uri = new Uri(htmlPath);

            // Listen for navigation completion to ensure the page is fully loaded before injecting data.
            CalendarWebView.NavigationCompleted += CalendarWebView_NavigationCompleted;

            // Navigate to file
            CalendarWebView.CoreWebView2.Navigate(uri.AbsoluteUri);

            // Open DevTools to see console output when the program is run.
            //CalendarWebView.CoreWebView2.OpenDevToolsWindow();

            CalendarWebView.CoreWebView2.WebMessageReceived += async (sender, args) =>
            {
                string csvContent = args.TryGetWebMessageAsString();
                string csvPath = Path.Combine(AppContext.BaseDirectory, "Assets", "Calendar", "userdata.csv");
                await File.WriteAllTextAsync(csvPath, csvContent);
            };

        }
        //Wait for the WebView to finish loading before injecting data
        private async void CalendarWebView_NavigationCompleted(object? sender, Microsoft.Web.WebView2.Core.CoreWebView2NavigationCompletedEventArgs e)
        {
            await CalendarData();
        }
        //The weird datatype is a Task, which is used for asynchronous programming in C#. It allows the method to run asynchronously without blocking the main thread, or in our case, waiting for Webview.
        private async System.Threading.Tasks.Task CalendarData()
        {
            // Read CSV content
            string csvPath = Path.Combine(AppContext.BaseDirectory, "Assets", "Calendar", "userdata.csv");
            string csvContent = await File.ReadAllTextAsync(csvPath);

            //CSV content may contain special characters, so we need to wrap it properly to prevent injection issues.
            string escapedCsv = System.Text.Json.JsonSerializer.Serialize(csvContent);
            await CalendarWebView.CoreWebView2.ExecuteScriptAsync($"window.csvData = {escapedCsv};");


        }
    }
}
