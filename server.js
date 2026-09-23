const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// VOLATILE RAM STORAGE ONLY: Wiped completely on server restart/sleep
let systemState = {
    stock: { PG: 10, P: 10, G: 10 },
    orders: [],
    totalEarnings: 0
};

// GET System Status (Stock & Earnings)
app.get('/api/status', (req, res) => {
    res.json({ stock: systemState.stock, totalEarnings: systemState.totalEarnings });
});

// GET Inbox Orders (Seller POV)
app.get('/api/orders', (req, res) => {
    res.json(systemState.orders);
});

// POST Place Order (Buyer POV)
app.post('/api/orders', (req, res) => {
    const { orderNumber, name, amountPaid, type, proxyPayload } = req.body;
    
    if (!orderNumber || !name || !amountPaid || !type) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    if (systemState.stock[type] <= 0) {
        return res.status(400).json({ error: `Item type (\${type}) is currently out of stock.` });
    }

    systemState.stock[type] -= 1;
    systemState.totalEarnings += parseFloat(amountPaid);

    const newOrder = {
        id: Date.now().toString(),
        orderNumber,
        name,
        amountPaid: parseFloat(amountPaid),
        type,
        proxyPayload: proxyPayload || 'No proxy data attached',
        date: new Date().toLocaleString()
    };

    systemState.orders.unshift(newOrder); 
    res.json({ success: true, message: 'Order submitted securely to memory!', stock: systemState.stock });
});

// POST Update Stock (Seller POV)
app.post('/api/stock', (req, res) => {
    const { PG, P, G } = req.body;

    if (PG !== undefined) systemState.stock.PG = parseInt(PG);
    if (P !== undefined) systemState.stock.P = parseInt(P);
    if (G !== undefined) systemState.stock.G = parseInt(G);

    res.json({ success: true, stock: systemState.stock });
});

// serve UI directly from backend to eliminate public folder dependency
app.get('/', (req, res) => {
    res.send(htmlPage);
});

app.listen(PORT, () => {
    console.log(`Steezys Proxy Trades running securely on http://localhost:\${PORT}`);
});

const htmlPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Steezys Proxy Trades</title>
    <script src="https://jsdelivr.net"></script>
    <style>
        @keyframes fadeInOut {
            0%, 100% { opacity: 0; transform: translateY(3px); }
            10%, 90% { opacity: 1; transform: translateY(0); }
        }
        .ticker-fade { animation: fadeInOut 5s infinite ease-in-out; }
        .glass-panel { background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(12px); }
    </style>
</head>
<body class="bg-[#090d16] text-slate-200 min-h-screen font-sans selection:bg-indigo-500 selection:text-white">

    <!-- Navbar -->
    <header class="bg-[#0f1524]/90 border-b border-slate-800/80 px-6 py-4 flex justify-between items-center shadow-2xl sticky top-0 z-40 backdrop-blur">
        <h1 class="text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500">STEEZYS PROXY TRADES</h1>
        <div class="flex items-center gap-4">
            <select id="roleView" onchange="toggleRoleView()" class="bg-[#182235] text-xs font-semibold rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:border-indigo-500 text-slate-300">
                <option value="buyer">Buyer View</option>
                <option value="seller">Seller / Owner View</option>
            </select>
            <button id="inboxBtn" onclick="toggleInboxModal()" class="hidden bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-900/30 transition-all border border-indigo-500/20">
                📥 Inbox <span id="inboxCount" class="bg-rose-500 text-[10px] font-black px-2 py-0.5 rounded-md shadow-inner text-white">0</span>
            </button>
        </div>
    </header>

    <!-- Sleek Fading Tips Menu Banner -->
    <div id="tipsBanner" class="bg-[#0b101d] border-b border-slate-800/60 py-2 text-center text-xs font-medium tracking-wide text-indigo-300/90 min-h-[36px] flex justify-center items-center shadow-inner">
        <div id="tickerText" class="ticker-fade">Loading configuration terminal items...</div>
    </div>

    <main class="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Stock Widget -->
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 shadow-2xl shadow-black/40">
            <h2 class="text-xs font-bold uppercase tracking-widest mb-4 text-slate-400 flex items-center gap-1.5"><span class="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></span> Stock Manifest</h2>
            <div class="space-y-2.5">
                <div class="flex justify-between items-center bg-[#11192b]/80 p-3.5 rounded-xl border border-slate-800/50">
                    <span class="text-sm font-medium text-amber-400/90">(PG) Proxy + Game</span>
                    <span id="stock-PG" class="font-mono text-lg font-bold text-white">0</span>
                </div>
                <div class="flex justify-between items-center bg-[#11192b]/80 p-3.5 rounded-xl border border-slate-800/50">
                    <span class="text-sm font-medium text-indigo-400/90">(P) Proxy</span>
                    <span id="stock-P" class="font-mono text-lg font-bold text-white">0</span>
                </div>
                <div class="flex justify-between items-center bg-[#11192b]/80 p-3.5 rounded-xl border border-slate-800/50">
                    <span class="text-sm font-medium text-emerald-400/90">(G) Games</span>
                    <span id="stock-G" class="font-mono text-lg font-bold text-white">0</span>
                </div>
            </div>
        </div>

        <!-- SELLER ONLY: Terminal Dashboard Controls -->
        <div id="sellerDashboard" class="hidden md:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-6">
            <div>
                <h2 class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Revenue Log</h2>
                <div class="bg-gradient-to-b from-[#131d33] to-[#0f172a] border border-slate-700/30 p-5 rounded-xl flex flex-col justify-center">
                    <p class="text-[10px] uppercase font-bold tracking-wider text-slate-400">Aggregated Earnings</p>
                    <p class="text-3xl font-black mt-0.5 font-mono text-emerald-400">$<span id="totalEarnings">0.00</span></p>
                </div>
            </div>

            <div>
                <h3 class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Adjust Stock Quantities</h3>
                <form id="stockForm" onsubmit="updateStock(event)" class="grid grid-cols-3 gap-3">
                    <div>
                        <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">PG Stock</label>
                        <input type="number" id="set-PG" class="w-full bg-[#111827] border border-slate-800 rounded-lg p-2 font-mono text-sm focus:border-indigo-500 outline-none text-white">
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">P Stock</label>
                        <input type="number" id="set-P" class="w-full bg-[#111827] border border-slate-800 rounded-lg p-2 font-mono text-sm focus:border-indigo-500 outline-none text-white">
                    </div>
                    <div>
                        <label class="block text-[10px] uppercase font-bold text-slate-500 mb-1">G Stock</label>
                        <input type="number" id="set-G" class="w-full bg-[#111827] border border-slate-800 rounded-lg p-2 font-mono text-sm focus:border-indigo-500 outline-none text-white">
                    </div>
                    <button type="submit" class="col-span-3 mt-1 bg-[#161f33] hover:bg-[#1d2942] border border-slate-700/60 py-2 rounded-lg font-bold text-xs uppercase tracking-wider text-slate-300 transition-all cursor-pointer">Commit Configurations</button>
                </form>
            </div>
        </div>

        <!-- BUYER ONLY: Place Order View -->
        <div id="buyerDashboard" class="md:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 shadow-2xl flex flex-col justify-center items-center text-center py-14">
            <h2 class="text-2xl font-black text-white mb-2 tracking-wide">Secure Transaction Gate</h2>
            <p class="text-slate-400 text-xs max-w-sm mb-6 leading-relaxed">Deposit real-life order tokens and pass structural payloads directly into temporary processing nodes.</p>
            <button onclick="openOrderModal()" class="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm tracking-wide px-8 py-3.5 rounded-xl shadow-xl shadow-indigo-950/50 transform hover:-translate-y-0.5 transition-all border border-indigo-400/20 cursor-pointer">
                🚀 Initiate Order Entry
            </button>
        </div>
    </main>

    <!-- BUYER MODAL: Order Form -->
    <div id="orderModal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
        <div class="bg-[#0c1220] border border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl relative">
            <h3 class="text-lg font-bold mb-4 text-white tracking-wide">Submit Order Package</h3>
            <form onsubmit="submitOrder(event)" class="space-y-3.5">
                <div>
                    <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Real-Life Order Token</label>
                    <input type="text" id="orderNumber" required class="w-full bg-[#111827] border border-slate-800 rounded-lg p-2.5 text-xs outline-none text-white focus:border-indigo-500">
                </div>
                <div>
                    <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Your Name</label>
                    <input type="text" id="buyerName" required class="w-full bg-[#111827] border border-slate-800 rounded-lg p-2.5 text-xs outline-none text-white focus:border-indigo-500">
                </div>
                <div>
                    <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Amount Paid (\$)</label>
                    <input type="number" step="0.01" id="amountPaid" required class="w-full bg-[#111827] border border-slate-800 rounded-lg p-2.5 text-xs outline-none text-white focus:border-indigo-500 font-mono">
                </div>
                <div>
                    <label class="block text-[10px] uppercase font-bold text-slate-400 mb-1">Trade Category</label>
                    <select id="tradeType" class="w-full bg-[#111827] border border-slate-800 rounded-lg p-2.5 text-xs outline-none text-slate-300 focus:border-indigo-500">
                        <option value="PG">(PG) Proxy + Game (\$4.00)</option>
                        <option value="P">(P) Proxy (\$2.00)</option>
                        <option value="G">(G) Games (\$1.00)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] uppercase font-bold text-amber-400 mb-1">Secure Delivery Payload (RAM-Only / No Save)</label>
                    <textarea id="proxyPayload" rows="2" placeholder="Paste sensitive items here. Clears entirely upon terminal reboot..." class="w-full bg-[#070b14] border border-amber-500/20 rounded-lg p-2.5 text-amber-300 text-[11px] font-mono outline-none focus:border-amber-500/60"></textarea>
                </div>
                <div class="flex gap-2.5 mt-5">
                    <button type="button" onclick="closeOrderModal()" class="w-1/2 bg-[#161f30] hover:bg-[#1f2b42] text-slate-400 font-bold py-2 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer">Abort</button>
                    <button type="submit" class="w-1/2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold py-2 rounded-lg text-xs uppercase tracking-wider transition-all cursor-pointer">Dispatch</button>
                </div>
            </form>
        </div>
    </div>

    <!-- SELLER MODAL: Orders Inbox -->
    <div id="inboxModal" class="hidden fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
        <div class="bg-[#0c1220] border border-slate-800 max-w-2xl w-full rounded-2xl p-6 shadow-2xl relative max-h-[80vh] flex flex-col">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-sm font-bold uppercase tracking-widest text-white">RAM Allocation Feed</h3>
                <button onclick="toggleInboxModal()" class="text-slate-500 hover:text-slate-300 font-bold text-xs uppercase tracking-wider cursor-pointer">✕ Dismiss</button>
            </div>
            <div id="orderList" class="space-y-3 overflow-y-auto flex-1 pr-1">
                <!-- Dynamic Content Loads Here -->
            </div>
        </div>
    </div>

    <script>
        const tips = [
            "⚡ PRICING: (P) Proxy Node: \$2.00",
            "🎮 PRICING: (G) Game Hub: \$1.00",
            "🔥 BUNDLE: (PG) Complete Infrastructure Package: \$4.00",
            "🔒 Security Protocol: Active. Zero files are created or maintained for transaction payloads."
        ];
        let currentTipIndex = 0;

        function cycleTips() {
            const tickerText = document.getElementById('tickerText');
            if(tickerText) {
                tickerText.innerText = tips[currentTipIndex];
                currentTipIndex = (currentTipIndex + 1) % tips.length;
            }
        }
        setInterval(cycleTips, 5000);
        cycleTips();

        async function updateDashboardData() {
            const res = await fetch('/api/status');
            const data = await res.json();
            
            document.getElementById('stock-PG').innerText = data.stock.PG;
            document.getElementById('stock-P').innerText = data.stock.P;
            document.getElementById('stock-G').innerText = data.stock.G;

            document.getElementById('totalEarnings').innerText = data.totalEarnings.toFixed(2);
            document.getElementById('set-PG').value = data.stock.PG;
            document.getElementById('set-P').value = data.stock.P;
            document.getElementById('set-G').value = data.stock.G;
        }

        async function updateInbox() {
            const res = await fetch('/api/orders');
            const orders = await res.json();
            document.getElementById('inboxCount').innerText = orders.length;

            const orderList = document.getElementById('orderList');
            if (orders.length === 0) {
                orderList.innerHTML = \`<p class="text-slate-600 text-center py-8 text-xs font-mono">No telemetry payloads currently stored inside active system memory.</p>\`;
                return;
            }

            orderList.innerHTML = orders.map(order => \`
                <div class="bg-[#121a2b] border border-slate-800 p-4 rounded-xl space-y-3 shadow-inner">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="bg-[#1e1b4b] text-indigo-300 font-mono text-[10px] px-2 py-0.5 rounded border border-indigo-800/60 font-bold">TOKEN: \${order.orderNumber}</span>
                                <span class="text-xs font-bold text-slate-300">\${order.name}</span>
                            </div>
                            <p class="text-[10px] text-slate-500 font-mono mt-1">Staged: \${order.date}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-emerald-400 font-black font-mono text-sm">\$\${order.amountPaid.toFixed(2)}</p>
                            <span class="inline-block text-[9px] uppercase tracking-wider bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold border border-slate-700/50">\${order.type}</span>
                        </div>
                    </div>
                    <div class="bg-[#070b14] border border-amber-500/10 p-2.5 rounded font-mono text-[11px] text-amber-400/90 break-all select-all relative group">
                        <span class="text-slate-600 block text-[9px] uppercase font-sans font-bold tracking-widest mb-1">Volatile Data payload:</span>
                        \${order.proxyPayload}
                    </div>
                </div>
            \`).join('');
        }

        function toggleRoleView() {
            const role = document.getElementById('roleView').value;
            const inboxBtn = document.getElementById('inboxBtn');
            const sellerDb = document.getElementById('sellerDashboard');
            const buyerDb = document.getElementById('buyerDashboard');
            const tipsBanner = document.getElementById('tipsBanner');

            if (role === 'seller') {
                inboxBtn.classList.remove('hidden');
                sellerDb.classList.remove('hidden');
                buyerDb.classList.add('hidden');
                tipsBanner.classList.add('hidden');
                updateInbox();
            } else {
                inboxBtn.classList.add('hidden');
                sellerDb.classList.add('hidden');
                buyerDb.classList.remove('hidden');
                tipsBanner.classList.remove('hidden');
            }
        }

        async function submitOrder(e) {
            e.preventDefault();
            const orderData = {
                orderNumber: document.getElementById('orderNumber').value,
                name: document.getElementById('buyerName').value,
                amountPaid: document.getElementById('amountPaid').value,
                type: document.getElementById('tradeType').value,
                proxyPayload: document.getElementById('proxyPayload').value
            };

            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });

            const result = await response.json();
            if (result.error) {
                alert(result.error);
            } else {
                alert(result.message);
                closeOrderModal();
                updateDashboardData();
                updateInbox();
                e.target.reset();
            }
        }

        async function updateStock(e) {
            e.preventDefault();
            const stockData = {
                PG: document.getElementById('set-PG').value,
                P: document.getElementById('set-P').value,
                G: document.getElementById('set-G').value
            };

            await fetch('/api/stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stockData)
            });

            alert('Stock system configurations successfully committed to system RAM.');
            updateDashboardData();
        }

        function openOrderModal() { document.getElementById('orderModal').classList.remove('hidden'); }
        function closeOrderModal() { document.getElementById('orderModal').classList.add('hidden'); }
        function toggleInboxModal() { document.getElementById('inboxModal').classList.toggle('hidden'); }

        updateDashboardData();
    </script>
</body>
</html>
\`;
