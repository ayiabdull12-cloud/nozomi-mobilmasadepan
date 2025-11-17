
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nozomi - Mobilitas Trimodal Masa Depan</title>
    <style>
        /* Gaya Dasar Global */
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f9;
            color: #333;
        }
        .container {
            width: 90%;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px 0;
        }
        /* Header dan Navigasi */
        header {
            background-color: #0d47a1; /* Biru Tua */
            color: white;
            padding: 15px 0;
        }
        .navbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo {
            font-size: 1.8em;
            font-weight: bold;
            color: white;
            text-decoration: none;
        }
        .nav-links a {
            color: white;
            text-decoration: none;
            margin-left: 25px;
            font-weight: 500;
        }
        /* Hero Section */
        .hero {
            background: linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('placeholder-visual.jpg'); /* Ganti dengan gambar/video futuristik */
            background-size: cover;
            background-position: center;
            height: 60vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            color: white;
            padding: 0 20px;
        }
        .hero h1 {
            font-size: 3.5em;
            margin-bottom: 15px;
        }
        .hero p {
            font-size: 1.4em;
            margin-bottom: 30px;
        }
        .cta-button {
            background-color: #ffc107; /* Kuning Mencolok */
            color: #333;
            padding: 15px 30px;
            text-decoration: none;
            font-size: 1.2em;
            font-weight: bold;
            border-radius: 5px;
            transition: background-color 0.3s;
        }
        .cta-button:hover {
            background-color: #ffeb3b;
        }
        /* Key Features Section */
        .features {
            text-align: center;
            padding: 60px 0;
        }
        .features h2 {
            font-size: 2em;
            color: #0d47a1;
            margin-bottom: 50px;
        }
        .feature-grid {
            display: flex;
            justify-content: space-around;
            gap: 20px;
        }
        .feature-item {
            flex-basis: 30%;
            padding: 20px;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        .feature-item h3 {
            color: #0d47a1;
            margin-top: 10px;
        }
        /* Footer */
        footer {
            background-color: #333;
            color: white;
            padding: 40px 0;
            text-align: center;
        }
        .footer-links a {
            color: #ffc107;
            text-decoration: none;
            margin: 0 15px;
        }
    </style>
</head>
<body>

    <header>
        <div class="container navbar">
            <a href="#" class="logo">🚀 NOZOMI</a>
            <div class="nav-links">
                <a href="#model">✨ Model Alpha 360</a>
                <a href="#teknologi">💡 Teknologi</a>
                <a href="#visi">🌐 Visi</a>
                <a href="#kontak">📞 Kontak</a>
            </div>
        </div>
    </header>

    <section class="hero">
        <h1>Tiga Elemen, Satu Perjalanan.</h1>
        <h1>Bebas Bergerak, Tanpa Batas.</h1>
        <p>Memperkenalkan **Nozomi Alpha 360**, kendaraan pertama di dunia yang menguasai Darat, Terbang, dan Air.</p>
        <a href="#pre-order" class="cta-button">JELAJAHI MODEL ALPHA 360 SEKARANG</a>
    </section>

    <section class="features" id="model">
        <div class="container">
            <h2>INOVASI TRIMODAL NOZOMI</h2>
            <div class="feature-grid">
                <div class="feature-item">
                    <h3>MODE DARAT</h3>
                    <p>Melaju otonom di kecepatan 180 km/jam. Kenyamanan superior dengan sistem Mag-Drive listrik.</p>
                </div>
                <div class="feature-item">
                    <h3>MODE TERBANG</h3>
                    <p>Teknologi eVTOL dengan 8 rotor bertenaga ganda. Kecepatan jelajah 350 km/jam, bebas kemacetan.</p>
                </div>
                <div class="feature-item">
                    <h3>MODE AIR</h3>
                    <p>Lambung yang stabil dan Hydrojet tertutup. Bertransformasi menjadi speed boat yang lincah di 50 knot.</p>
                </div>
            </div>
        </div>
    </section>

    <section class="features" id="visi" style="background-color: #e3f2fd;">
        <div class="container">
            <h2>VISI KAMI: MEMBENTUK ULANG DUNIA</h2>
            <p style="font-size: 1.1em; max-width: 800px; margin: 20px auto;">Visi kami adalah menjadi pemimpin global dalam transportasi multi-elemen, didorong oleh inovasi berkelanjutan dan komitmen pada mobilitas **Zero Emisi**.</p>
            <a href="#" class="cta-button" style="background-color: #0d47a1; color: white;">PELAJARI LEBIH LANJUT TENTANG TEKNOLOGI</a>
        </div>
    </section>

    <footer>
        <div class="container">
            <p>&copy; 2025 Nozomi Hyper-Mobility Inc.</p>
            <div class="footer-links">
                <a href="#">Kebijakan Privasi</a> | 
                <a href="#">Karir</a> | 
                <a href="#">Media</a> |
                <a href="#">Kontak</a>
            </div>
        </div>
    </footer>

</body>
</html>
