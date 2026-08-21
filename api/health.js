export default function handler(req, res) {
    res.status(200).json({
        status: "UP",
        message: "CargoNet API is working"
    });
}