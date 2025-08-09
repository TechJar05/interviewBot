import React from "react";
import botImage from "../assets/botImage.png";
import { motion } from "framer-motion";

const Header = () => {
  return (
    <header className="relative w-full max-w-6xl mx-auto px-2 py-4 mb-4 mt-2">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-[#ffffff] backdrop-blur-md border border-[#000000]  rounded-2xl shadow-md px-6 py-4 flex items-center gap-4 transition-all hover:shadow-lg"
      >
        {/* Bot Image */}
        <motion.img
          src={botImage}
          alt="Bot Logo"
          className="w-12 h-12 rounded-full shadow-md border border-[#212020] object-cover"
          whileHover={{ scale: 1.1, rotate: 6 }}
          transition={{ type: "spring", stiffness: 300 }}
        />

        {/* Text Section */}
        <div>
          <h1 className="text-2xl md:text-3xl   font-[sans-serif] text-gray-800">
            <span className="text-[#00adb5] drop-shadow-sm font-extrabold text-3xl">NEX AI</span>{" "}
            <span className="text-gray-500 text-2xl font-medium">Interview Assistant</span>
          </h1>
          <p className="text-sm text-gray-600 mt-1 hidden sm:block font-[Inter]">
            Your smart companion for automated interviews
          </p>
        </div>
      </motion.div>
    </header>
  );
};

export default Header;
